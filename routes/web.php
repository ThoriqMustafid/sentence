<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\TranslationController;
use App\Http\Controllers\TranscriptController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

// Public translation proxy
Route::post('/api/translate', [TranslationController::class, 'translate']);

// Public store endpoint (associates with logged-in user if authenticated)
Route::post('/api/transcripts', [TranscriptController::class, 'store']);

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Authenticated transcript endpoints
    Route::get('/api/transcripts', [TranscriptController::class, 'index']);
    Route::get('/api/transcripts/{id}', [TranscriptController::class, 'show']);
    Route::delete('/api/transcripts/{id}', [TranscriptController::class, 'destroy']);
});

require __DIR__.'/auth.php';
