<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Transcript extends Model
{
    protected $fillable = [
        'user_id',
        'title',
        'original_text',
        'translated_text',
        'source_lang',
        'target_lang',
    ];

    /**
     * Get the user that owns the transcript.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
