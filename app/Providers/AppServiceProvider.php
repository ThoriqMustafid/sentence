<?php

namespace App\Providers;

use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Vercel may load a configuration cache created before its runtime
        // environment variables are available. Set the serverless-safe
        // defaults only after Laravel has registered its configuration
        // repository, preventing managers from receiving an empty driver.
        if (env('VERCEL')) {
            config([
                'cache.default' => 'array',
                'session.driver' => 'cookie',
                'queue.default' => 'sync',
                'filesystems.default' => 'local',
                'database.default' => 'sqlite',
            ]);
        }
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);
    }
}
