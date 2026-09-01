<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\Transcript;

class TranscriptController extends Controller
{
    /**
     * Display a listing of the user's transcripts.
     */
    public function index(Request $request)
    {
        $userId = auth()->id();
        if (!$userId) {
            return response()->json([]);
        }

        $transcripts = Transcript::where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($transcripts);
    }

    /**
     * Store a newly created transcript in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'title' => 'nullable|string',
            'original_text' => 'required|string',
            'translated_text' => 'required|string',
            'source_lang' => 'required|string',
            'target_lang' => 'required|string',
        ]);

        $title = $request->input('title') ?: 'Session - ' . now()->format('Y-m-d H:i');

        $transcript = Transcript::create([
            'user_id' => auth()->id(), // Can be null for guest sessions
            'title' => $title,
            'original_text' => $request->input('original_text'),
            'translated_text' => $request->input('translated_text'),
            'source_lang' => $request->input('source_lang'),
            'target_lang' => $request->input('target_lang'),
        ]);

        return response()->json($transcript, 201);
    }

    /**
     * Display the specified transcript.
     */
    public function show($id)
    {
        $transcript = Transcript::findOrFail($id);

        // If the transcript belongs to a user, authorize it
        if ($transcript->user_id && $transcript->user_id !== auth()->id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        return response()->json($transcript);
    }

    /**
     * Remove the specified transcript from storage.
     */
    public function destroy($id)
    {
        $transcript = Transcript::findOrFail($id);

        // Standard user check
        if ($transcript->user_id && $transcript->user_id !== auth()->id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        // Allow deleting guest transcripts if they possess the same session,
        // or if they are anonymous, but typically database delete is for authenticated users.
        if (!$transcript->user_id && !auth()->check()) {
            // For guest, let them delete since it was created in their current session.
        }

        $transcript->delete();

        return response()->json(['message' => 'Transcript deleted successfully']);
    }
}
