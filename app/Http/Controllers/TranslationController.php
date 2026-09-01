<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TranslationController extends Controller
{
    /**
     * Translate text from source language to target language.
     */
    public function translate(Request $request)
    {
        $request->validate([
            'text' => 'required|string',
            'source' => 'required|string',
            'target' => 'required|string',
        ]);

        $text = $request->input('text');
        $source = $this->normalizeLangCode($request->input('source'));
        $target = $this->normalizeLangCode($request->input('target'));

        // 1. Try DeepL if key is present
        $deeplKey = env('DEEPL_API_KEY');
        if ($deeplKey) {
            try {
                $isFree = str_ends_with($deeplKey, ':fx');
                $url = $isFree 
                    ? 'https://api-free.deepl.com/v2/translate' 
                    : 'https://api.deepl.com/v2/translate';

                $response = Http::withHeaders([
                    'Authorization' => 'DeepL-Auth-Key ' . $deeplKey,
                ])->post($url, [
                    'text' => [$text],
                    'target_lang' => strtoupper($target),
                ]);

                if ($response->successful()) {
                    $translatedText = $response->json('translations.0.text');
                    if ($translatedText) {
                        return response()->json(['translated_text' => $translatedText, 'provider' => 'deepl']);
                    }
                }
            } catch (\Exception $e) {
                Log::error('DeepL Translation failed: ' . $e->getMessage());
            }
        }

        // 2. Try Google Cloud Translate if key is present
        $googleKey = env('GOOGLE_TRANSLATE_KEY') ?: env('GOOGLE_TRANSLATE_API_KEY');
        if ($googleKey) {
            try {
                $response = Http::post('https://translation.googleapis.com/language/translate/v2?key=' . $googleKey, [
                    'q' => $text,
                    'source' => $source,
                    'target' => $target,
                    'format' => 'text',
                ]);

                if ($response->successful()) {
                    $translatedText = $response->json('data.translations.0.translatedText');
                    if ($translatedText) {
                        return response()->json(['translated_text' => $translatedText, 'provider' => 'google_cloud']);
                    }
                }
            } catch (\Exception $e) {
                Log::error('Google Cloud Translation failed: ' . $e->getMessage());
            }
        }

        // 3. Fallback: Free Google Translate Web API
        try {
            $response = Http::get('https://translate.googleapis.com/translate_a/single', [
                'client' => 'gtx',
                'sl' => $source,
                'tl' => $target,
                'dt' => 't',
                'q' => $text,
            ]);

            if ($response->successful()) {
                $data = $response->json();
                if (isset($data[0]) && is_array($data[0])) {
                    $translatedText = collect($data[0])->map(function ($item) {
                        return $item[0] ?? '';
                    })->implode('');

                    return response()->json(['translated_text' => $translatedText, 'provider' => 'google_free']);
                }
            }
        } catch (\Exception $e) {
            Log::error('Free Google Translation failed: ' . $e->getMessage());
        }

        return response()->json([
            'translated_text' => $text,
            'provider' => 'fallback_none',
            'notice' => 'Translation services unavailable, returning original text'
        ], 200);
    }

    /**
     * Normalize browser language codes to standard API format (e.g. id-ID -> id, en-US -> en).
     */
    private function normalizeLangCode($lang)
    {
        $parts = explode('-', $lang);
        return strtolower($parts[0]);
    }
}
