<?php

declare(strict_types=1);

/**
 * POST php/register.php
 * Params: fullName, email, password
 * 201 account created | 409 email already registered
 * Field rules are checked in the browser by js/validation.js.
 */

require __DIR__ . '/config.php';

requirePostRequest();

$fullName = trim(readPostValue('fullName'));
// Stored lowercase so login is case-insensitive and the UNIQUE index catches duplicates in any casing.
$email = strtolower(trim(readPostValue('email')));
$password = readPostValue('password');

$passwordHash = password_hash($password, PASSWORD_DEFAULT);

$connection = getDatabaseConnection();
$statement = $connection->prepare(
    'INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)'
);
$statement->bind_param('sss', $fullName, $email, $passwordHash);

// Relying on the UNIQUE index (instead of a SELECT first) also covers two sign-ups with the same email at the same moment.
try {
    $statement->execute();
} catch (mysqli_sql_exception $exception) {
    if ($exception->getCode() === MYSQL_DUPLICATE_ENTRY_CODE) {
        sendFieldErrors(409, ['email' => 'An account with this email already exists.']);
    }
    throw $exception;
}

sendJson(201, [
    'success' => true,
    'message' => 'Registration successful. Redirecting to login...',
]);
