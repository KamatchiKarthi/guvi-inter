<?php

declare(strict_types=1);

/**
 * Router for PHP's built-in development server:
 *   php -S 127.0.0.1:8765 php/router.php
 * Apache deployments use .htaccess for the same protection.
 */

// php -S serves every file in the project as plain text, so dot-files such as .env must be blocked here.
$requestPath = rawurldecode((string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH));

if (preg_match('#(^|/)\.#', $requestPath) === 1) {
    http_response_code(404);
    return true;
}

// false tells the built-in server to handle the request normally (serve the file or run the PHP script).
return false;
