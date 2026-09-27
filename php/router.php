<?php

declare(strict_types=1);

// php -S serves every file in the project as plain text, so dot-files such as .env must be blocked here.
$requestPath = rawurldecode((string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH));

if (preg_match('#(^|/)\.#', $requestPath) === 1) {
    http_response_code(404);
    return true;
}

if ($requestPath === '/') {
    header('Location: /login.html', true, 302);
    return true;
}

return false;
