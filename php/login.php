<?php

declare(strict_types=1);

require __DIR__ . '/config.php';

const SESSION_TOKEN_BYTES = 32;

requirePostRequest();

$email = strtolower(trim(readPostValue('email')));
$password = readPostValue('password');

$connection = getDatabaseConnection();
$statement = $connection->prepare(
    'SELECT id, full_name, password_hash FROM users WHERE email = ? LIMIT 1'
);
$statement->bind_param('s', $email);
$statement->execute();
$user = $statement->get_result()->fetch_assoc();

if ($user === null || !password_verify($password, $user['password_hash'])) {
    sendError(401, 'Invalid email or password.');
}

$sessionToken = bin2hex(random_bytes(SESSION_TOKEN_BYTES));
getRedisConnection()->setex(buildSessionKey($sessionToken), SESSION_TTL_SECONDS, (string) $user['id']);

sendJson(200, [
    'success' => true,
    'message' => 'Login successful.',
    'data' => [
        'token' => $sessionToken,
        'fullName' => $user['full_name'],
    ],
]);
