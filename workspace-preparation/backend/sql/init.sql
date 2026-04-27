-- Lumiscore OpenClaw Portal MVP schema
-- The backend also creates this schema automatically on first run.
-- This file is provided as a migration/init reference.

CREATE DATABASE IF NOT EXISTS lumiscore_openclaw
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE lumiscore_openclaw;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  approved_by BIGINT UNSIGNED NULL,
  approved_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_status (status),
  KEY idx_users_role (role),
  KEY idx_users_approved_by (approved_by),
  CONSTRAINT fk_users_approved_by
    FOREIGN KEY (approved_by) REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The admin account is seeded by the backend on first run if it does not exist.
