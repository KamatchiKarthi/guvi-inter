<?php

declare(strict_types=1);

/**
 * POST php/login.php
 * Params: email, password
 * 200 { token, fullName } | 401 invalid credentials
 * The token is stored in Redis on the server and in localStorage in the browser.
 */

require __DIR__ . '/config.php';

// 32 random bytes = 64 hex characters, matching SESSION_TOKEN_PATTERN.
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

// One message for both cases, so nobody can use this form to find out which emails are registered.
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
