<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;

// Prepare /tmp storage directory structure for Vercel serverless environment
$storageDirs = [
    '/tmp/storage/app/public',
    '/tmp/storage/framework/cache/data',
    '/tmp/storage/framework/sessions',
    '/tmp/storage/framework/testing',
    '/tmp/storage/framework/views',
    '/tmp/storage/logs',
];

foreach ($storageDirs as $dir) {
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
}

$dbPath = '/tmp/database.sqlite';
$isNewDb = !file_exists($dbPath) || filesize($dbPath) === 0;
if ($isNewDb) {
    @touch($dbPath);
}

// Ensure APP_KEY exists so Laravel encryption and session work
if (empty($_ENV['APP_KEY']) && empty($_SERVER['APP_KEY'])) {
    $_ENV['APP_KEY'] = 'base64:Jq4z3mK50vF8n8u3mK50vF8n8u3mK50vF8n8u3mK50v=';
    $_SERVER['APP_KEY'] = $_ENV['APP_KEY'];
    putenv('APP_KEY=' . $_ENV['APP_KEY']);
}
// Sanitize and set serverless environment variables
$driverDefaults = [
    'SESSION_DRIVER' => 'cookie',
    'CACHE_STORE' => 'array',
    'CACHE_DRIVER' => 'array',
    'QUEUE_CONNECTION' => 'sync',
    'DB_CONNECTION' => 'sqlite',
    'FILESYSTEM_DISK' => 'local',
];

foreach ($driverDefaults as $var => $defaultVal) {
    if (empty($_ENV[$var])) {
        $_ENV[$var] = $defaultVal;
    }
    if (empty($_SERVER[$var])) {
        $_SERVER[$var] = $defaultVal;
    }
    if (getenv($var) === false || getenv($var) === '') {
        putenv("{$var}={$defaultVal}");
    }
}

$_ENV['APP_DEBUG'] = 'false';
$_SERVER['APP_DEBUG'] = 'false';
putenv('APP_DEBUG=false');

define('LARAVEL_START', microtime(true));

// Register Composer autoloader
require __DIR__ . '/../vendor/autoload.php';

// Bootstrap Laravel application
/** @var Application $app */
$app = require_once __DIR__ . '/../bootstrap/app.php';

// Override storage path to writable /tmp/storage
$app->useStoragePath('/tmp/storage');

// Vercel can boot with a cached configuration created before its runtime
// environment variables are available. Explicitly set the serverless-safe
// drivers after configuration has loaded so managers never resolve an empty
// driver name (which results in Manager::createDriver() being called without
// its required argument).
$app['config']->set([
    'cache.default' => 'array',
    'session.driver' => 'cookie',
    'queue.default' => 'sync',
    'filesystems.default' => 'local',
    'database.default' => 'sqlite',
]);

// Handle request
try {
    $app->handleRequest(Request::capture());
} catch (\Throwable $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['message' => 'Internal Server Error']);
}
