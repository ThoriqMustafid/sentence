<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Transcript;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

use Illuminate\Support\Facades\Http;

class SpeechTranslationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test translating text via proxy.
     */
    public function test_can_translate_text_via_proxy(): void
    {
        Http::fake([
            'translate.googleapis.com/*' => Http::response([[["Hello world", "Halo dunia"]]], 200),
        ]);

        $response = $this->postJson('/api/translate', [
            'text' => 'Halo dunia',
            'source' => 'id-ID',
            'target' => 'en-US',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['translated_text', 'provider']);

        $this->assertEquals('Hello world', $response->json('translated_text'));
    }

    /**
     * Test saving transcripts.
     */
    public function test_can_save_transcript(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/transcripts', [
            'title' => 'Test Meeting',
            'original_text' => json_encode([['id' => '1', 'original' => 'Halo', 'translated' => 'Hello']]),
            'translated_text' => json_encode([['id' => '1', 'original' => 'Halo', 'translated' => 'Hello']]),
            'source_lang' => 'id-ID',
            'target_lang' => 'en-US',
        ]);

        $response->assertStatus(201)
            ->assertJsonFragment([
                'title' => 'Test Meeting',
                'source_lang' => 'id-ID',
                'target_lang' => 'en-US',
            ]);

        $this->assertDatabaseHas('transcripts', [
            'title' => 'Test Meeting',
            'user_id' => $user->id,
        ]);
    }

    /**
     * Test guest can save transcript (without user_id).
     */
    public function test_guest_can_save_transcript(): void
    {
        $response = $this->postJson('/api/transcripts', [
            'title' => 'Guest Session',
            'original_text' => json_encode([['id' => '1', 'original' => 'Halo', 'translated' => 'Hello']]),
            'translated_text' => json_encode([['id' => '1', 'original' => 'Halo', 'translated' => 'Hello']]),
            'source_lang' => 'id-ID',
            'target_lang' => 'en-US',
        ]);

        $response->assertStatus(201)
            ->assertJsonFragment([
                'title' => 'Guest Session',
                'user_id' => null,
            ]);

        $this->assertDatabaseHas('transcripts', [
            'title' => 'Guest Session',
            'user_id' => null,
        ]);
    }

    /**
     * Test fetching transcripts lists.
     */
    public function test_authenticated_user_can_list_their_transcripts(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        Transcript::create([
            'user_id' => $user->id,
            'title' => 'User Transcript',
            'original_text' => 'Halo',
            'translated_text' => 'Hello',
            'source_lang' => 'id-ID',
            'target_lang' => 'en-US',
        ]);

        Transcript::create([
            'user_id' => $otherUser->id,
            'title' => 'Other User Transcript',
            'original_text' => 'Halo',
            'translated_text' => 'Hello',
            'source_lang' => 'id-ID',
            'target_lang' => 'en-US',
        ]);

        $response = $this->actingAs($user)->getJson('/api/transcripts');

        $response->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonFragment(['title' => 'User Transcript'])
            ->assertJsonMissing(['title' => 'Other User Transcript']);
    }

    /**
     * Test deleting a transcript.
     */
    public function test_user_can_delete_their_transcript(): void
    {
        $user = User::factory()->create();

        $transcript = Transcript::create([
            'user_id' => $user->id,
            'title' => 'Delete Me',
            'original_text' => 'Halo',
            'translated_text' => 'Hello',
            'source_lang' => 'id-ID',
            'target_lang' => 'en-US',
        ]);

        $response = $this->actingAs($user)->deleteJson("/api/transcripts/{$transcript->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('transcripts', ['id' => $transcript->id]);
    }
}
