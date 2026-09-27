<?php

declare(strict_types=1);

/**
 * POST php/profile.php
 * Params: token, action = fetch | update | logout
 *         update also takes age, dob, contact, address (all optional)
 * 200 success | 401 session missing or expired | 400 unknown action
 * The token from localStorage is checked against Redis on every request.
 */

require __DIR__ . '/config.php';

/**
 * LEFT JOIN so users who have never saved profile details still load;
 * their profile fields come back as null.
 */
function fetchProfile(mysqli $connection, int $userId): ?array
{
    $statement = $connection->prepare(
        'SELECT users.full_name, users.email, user_profiles.age, user_profiles.dob,
                user_profiles.contact, user_profiles.address
         FROM users
         LEFT JOIN user_profiles ON user_profiles.user_id = users.id
         WHERE users.id = ?
         LIMIT 1'
    );
    $statement->bind_param('i', $userId);
    $statement->execute();

    $profileRow = $statement->get_result()->fetch_assoc();
    if ($profileRow === null) {
        return null;
    }

    return [
        'fullName' => $profileRow['full_name'],
        'email' => $profileRow['email'],
        'age' => $profileRow['age'] === null ? null : (int) $profileRow['age'],
        'dob' => $profileRow['dob'],
        'contact' => $profileRow['contact'],
        'address' => $profileRow['address'],
    ];
}

/**
 * Cleared optional fields are stored as NULL rather than empty strings.
 */
function nullIfEmpty(string $value): ?string
{
    return $value === '' ? null : $value;
}

/**
 * Upsert: creates the user's profile row on the first save and updates it afterwards.
 */
function updateProfile(mysqli $connection, int $userId): void
{
    $ageInput = trim(readPostValue('age'));
    $dobInput = trim(readPostValue('dob'));
    $contactInput = trim(readPostValue('contact'));
    $addressInput = trim(readPostValue('address'));

    $age = $ageInput === '' ? null : (int) $ageInput;
    $dateOfBirth = nullIfEmpty($dobInput);
    $contact = nullIfEmpty($contactInput);
    $address = nullIfEmpty($addressInput);

    $statement = $connection->prepare(
        'INSERT INTO user_profiles (user_id, age, dob, contact, address)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            age = VALUES(age),
            dob = VALUES(dob),
            contact = VALUES(contact),
            address = VALUES(address)'
    );
    $statement->bind_param('iisss', $userId, $age, $dateOfBirth, $contact, $address);
    $statement->execute();
}

requirePostRequest();

$sessionToken = trim(readPostValue('token'));
if (!isValidSessionToken($sessionToken)) {
    sendError(401, 'Session expired. Please log in again.');
}

$redis = getRedisConnection();
$sessionKey = buildSessionKey($sessionToken);
$storedUserId = $redis->get($sessionKey);
if ($storedUserId === false) {
    sendError(401, 'Session expired. Please log in again.');
}

$userId = (int) $storedUserId;
$action = readPostValue('action');

if ($action === 'logout') {
    $redis->del($sessionKey);
    sendJson(200, ['success' => true, 'message' => 'Logged out successfully.']);
}

// Sliding expiry: any activity keeps the session alive for another SESSION_TTL_SECONDS.
$redis->expire($sessionKey, SESSION_TTL_SECONDS);
$connection = getDatabaseConnection();

if ($action === 'update') {
    updateProfile($connection, $userId);
    sendJson(200, [
        'success' => true,
        'message' => 'Profile updated successfully.',
        'data' => fetchProfile($connection, $userId),
    ]);
}

if ($action === 'fetch') {
    $profile = fetchProfile($connection, $userId);
    // The account was removed while its session was still active, so the session is dropped too.
    if ($profile === null) {
        $redis->del($sessionKey);
        sendError(401, 'Account not found. Please log in again.');
    }
    sendJson(200, ['success' => true, 'message' => 'Profile loaded.', 'data' => $profile]);
}

sendError(400, 'Unknown action.');
