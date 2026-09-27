# User Portal

Register → Login → Profile, built with HTML, CSS (Bootstrap 5), jQuery AJAX, PHP, MySQL and Redis.

## Folder structure

```
assets/        logo.svg
css/           style.css
js/            common.js, validation.js, login.js, profile.js, register.js
php/           config.php, router.php, login.php, profile.php, register.php
sql/           schema.sql
index.html  login.html  profile.html  register.html
```

`index.html` forwards visitors to the login page.

## How it works

- Frontend talks to the backend only through jQuery AJAX (forms never submit natively).
- User accounts and profile details are stored in MySQL using prepared statements only.
- On login, PHP creates a random token and stores `token -> user id` in Redis with a 1 hour sliding expiry.
- The browser keeps the token in `localStorage`; PHP sessions are not used.
- Logout deletes the Redis key and clears `localStorage`.

## Requirements

- PHP 7.4+ with the `mysqli`, `mbstring`, `openssl` and `redis` (phpredis) extensions enabled
  - Windows: download the matching `php_redis` DLL from https://downloads.php.net/~windows/pecl/releases/redis/
    and enable the extensions in `php.ini` (set the `PHPRC` environment variable if `php.ini` is outside the PHP folder)
- MySQL 5.7+ / MariaDB 10.3+
- Redis server

## Setup

1. Create the database:

   ```
   mysql -u root -p < sql/schema.sql
   ```

2. Start Redis (default `127.0.0.1:6379`).

3. Copy `.env.example` to `.env` and fill in your MySQL and Redis details.
   `php/config.php` loads `.env` automatically; real environment variables (e.g. set by a hosting provider) take priority.
   For hosted MySQL that requires SSL (e.g. Aiven), set `DB_SSL=true`, and optionally `DB_SSL_CA=/path/to/ca.pem`
   to verify the server certificate.

   `.env` contains secrets: never share or upload it. `php/router.php` (dev server) and `.htaccess` (Apache) block
   it from being downloaded.

4. Run the app from the project root:

   ```
   php -S 127.0.0.1:8765 php/router.php
   ```

5. Open http://127.0.0.1:8765 — it opens the login page.
