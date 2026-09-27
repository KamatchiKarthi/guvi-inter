CREATE DATABASE IF NOT EXISTS guvi_internship
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE guvi_internship;

CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS user_profiles (
    user_id INT UNSIGNED NOT NULL,
    age TINYINT UNSIGNED NULL,
    dob DATE NULL,
    contact VARCHAR(20) NULL,
    address VARCHAR(255) NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    CONSTRAINT fk_user_profiles_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE
) ENGINE = InnoDB;
