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
$_ENV['APP_DEBUG'] = 'true';
$_SERVER['APP_DEBUG'] = 'true';
putenv('APP_DEBUG=true');

define('LARAVEL_START', microtime(true));

// Register Composer autoloader
require __DIR__ . '/../vendor/autoload.php';

// Bootstrap Laravel application
/** @var Application $app */
$app = require_once __DIR__ . '/../bootstrap/app.php';

// Override storage path to writable /tmp/storage
$app->useStoragePath('/tmp/storage');

// Handle request
try {
    $app->handleRequest(Request::capture());
} catch (\Throwable $e) {
    http_response_code(500);
    header('Content-Type: text/html');
    echo '<h1>Server Error (500)</h1>';
    echo '<p><strong>Message:</strong> ' . htmlspecialchars($e->getMessage()) . '</p>';
    echo '<p><strong>File:</strong> ' . htmlspecialchars($e->getFile()) . ':' . $e->getLine() . '</p>';
    echo '<pre>' . htmlspecialchars($e->getTraceAsString()) . '</pre>';
}

