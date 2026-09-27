<?php

declare(strict_types=1);

require __DIR__ . '/config.php';

requirePostRequest();

$fullName = trim(readPostValue('fullName'));
$email = strtolower(trim(readPostValue('email')));
$password = readPostValue('password');

$passwordHash = password_hash($password, PASSWORD_DEFAULT);

$connection = getDatabaseConnection();
$statement = $connection->prepare(
    'INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)'
);
$statement->bind_param('sss', $fullName, $email, $passwordHash);

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
