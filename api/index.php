<?php

// Ensure SQLite database exists in /tmp for Vercel serverless environment
$dbPath = '/tmp/database.sqlite';
if (!file_exists($dbPath)) {
    @touch($dbPath);
}

// Forward serverless request to Laravel's public index
require __DIR__ . '/../public/index.php';
