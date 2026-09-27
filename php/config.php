<?php

declare(strict_types=1);

/**
 * Shared setup included by every endpoint: loads .env, opens the MySQL and Redis
 * connections, and provides the JSON response and session-token helpers.
 */

// Sessions expire after 1 hour of inactivity; every profile request resets the timer.
const SESSION_TTL_SECONDS = 3600;
const SESSION_KEY_PREFIX = 'guvi:session:';
const SESSION_TOKEN_PATTERN = '/^[a-f0-9]{64}$/';
const MYSQL_DUPLICATE_ENTRY_CODE = 1062;
const ENV_FILE_PATH = __DIR__ . '/../.env';

/**
 * Reads KEY=VALUE lines from .env into the process environment.
 * Blank lines and lines starting with # are ignored.
 */
function loadEnvironmentFile(string $filePath): void
{
    if (!is_readable($filePath)) {
        return;
    }

    foreach (file($filePath, FILE_IGNORE_NEW_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || strpos($line, '=') === false) {
            continue;
        }

        [$name, $value] = array_map('trim', explode('=', $line, 2));
        // Real environment variables (e.g. set by a hosting provider) take priority over .env.
        if (getenv($name) === false) {
            putenv($name . '=' . $value);
        }
    }
}

loadEnvironmentFile(ENV_FILE_PATH);

/**
 * Falls back to $defaultValue when the variable is missing or empty,
 * so a local setup works without every key in .env.
 */
function readEnvironment(string $name, string $defaultValue): string
{
    $value = getenv($name);

    return ($value === false || $value === '') ? $defaultValue : $value;
}

/**
 * Every endpoint responds with { success, message, data?, errors? }.
 * Execution stops here, so nothing runs after a response is sent.
 */
function sendJson(int $statusCode, array $payload): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload);
    exit;
}

function sendError(int $statusCode, string $message): void
{
    sendJson($statusCode, ['success' => false, 'message' => $message]);
}

/**
 * Keys of $fieldErrors must match the input ids on the page, so the frontend
 * can show each message under its field (see showServerErrors in js/validation.js).
 */
function sendFieldErrors(int $statusCode, array $fieldErrors): void
{
    sendJson($statusCode, [
        'success' => false,
        'message' => reset($fieldErrors),
        'errors' => $fieldErrors,
    ]);
}

// Database/Redis failures are logged on the server; the browser only gets a generic
// message so connection details and SQL errors are never exposed.
set_exception_handler(static function (Throwable $exception): void {
    error_log($exception->getMessage());
    sendError(500, 'Server error. Please try again later.');
});

/**
 * All endpoints accept POST only, so passwords and tokens never appear in URLs or access logs.
 */
function requirePostRequest(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        header('Allow: POST');
        sendError(405, 'Method not allowed.');
    }
}

/**
 * Always returns a string; arrays such as email[]=x are treated as empty input.
 */
function readPostValue(string $field): string
{
    $value = $_POST[$field] ?? '';

    return is_string($value) ? $value : '';
}

/**
 * Strict reporting turns every MySQL error into an exception, which the handler above catches.
 * Set DB_SSL=true for hosted databases (e.g. Aiven) that require encrypted connections.
 */
function getDatabaseConnection(): mysqli
{
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

    $connection = mysqli_init();
    $clientFlags = 0;

    if (readEnvironment('DB_SSL', 'false') === 'true') {
        $sslCaPath = readEnvironment('DB_SSL_CA', '');
        if ($sslCaPath !== '') {
            $connection->ssl_set(null, null, $sslCaPath, null, null);
            $clientFlags = MYSQLI_CLIENT_SSL;
        } else {
            // Encrypts traffic without a CA file; set DB_SSL_CA to also verify the server identity.
            $clientFlags = MYSQLI_CLIENT_SSL | MYSQLI_CLIENT_SSL_DONT_VERIFY_SERVER_CERT;
        }
    }

    $connection->real_connect(
        readEnvironment('DB_HOST', '127.0.0.1'),
        readEnvironment('DB_USER', 'root'),
        readEnvironment('DB_PASSWORD', ''),
        readEnvironment('DB_NAME', 'guvi_internship'),
        (int) readEnvironment('DB_PORT', '3306'),
        null,
        $clientFlags
    );
    $connection->set_charset('utf8mb4');

    return $connection;
}

/**
 * REDIS_PASSWORD is optional: a local Redis usually has none, hosted Redis (e.g. Redis Cloud) requires one.
 */
function getRedisConnection(): Redis
{
    $redis = new Redis();
    $redis->connect(
        readEnvironment('REDIS_HOST', '127.0.0.1'),
        (int) readEnvironment('REDIS_PORT', '6379')
    );

    $redisPassword = readEnvironment('REDIS_PASSWORD', '');
    if ($redisPassword !== '') {
        $redis->auth($redisPassword);
    }

    return $redis;
}

/**
 * Redis layout: "<prefix><token>" => user id. The prefix keeps session keys
 * grouped and separate from any other data in the same Redis database.
 */
function buildSessionKey(string $token): string
{
    return SESSION_KEY_PREFIX . $token;
}

/**
 * Rejects malformed tokens before Redis is queried.
 */
function isValidSessionToken(string $token): bool
{
    return preg_match(SESSION_TOKEN_PATTERN, $token) === 1;
}
