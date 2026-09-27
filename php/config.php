<?php

declare(strict_types=1);

const SESSION_TTL_SECONDS = 3600;
const SESSION_KEY_PREFIX = 'guvi:session:';
const SESSION_TOKEN_PATTERN = '/^[a-f0-9]{64}$/';
const MYSQL_DUPLICATE_ENTRY_CODE = 1062;
const ENV_FILE_PATH = __DIR__ . '/../.env';

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

function readEnvironment(string $name, string $defaultValue): string
{
    $value = getenv($name);

    return ($value === false || $value === '') ? $defaultValue : $value;
}

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

function sendFieldErrors(int $statusCode, array $fieldErrors): void
{
    sendJson($statusCode, [
        'success' => false,
        'message' => reset($fieldErrors),
        'errors' => $fieldErrors,
    ]);
}

set_exception_handler(static function (Throwable $exception): void {
    error_log($exception->getMessage());
    sendError(500, 'Server error. Please try again later.');
});

function requirePostRequest(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        header('Allow: POST');
        sendError(405, 'Method not allowed.');
    }
}

function readPostValue(string $field): string
{
    $value = $_POST[$field] ?? '';

    return is_string($value) ? $value : '';
}

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

function buildSessionKey(string $token): string
{
    return SESSION_KEY_PREFIX . $token;
}

function isValidSessionToken(string $token): bool
{
    return preg_match(SESSION_TOKEN_PATTERN, $token) === 1;
}
