-- Run this once against your MySQL database to set up the schema.
-- Usage: mysql -u root -p sentimentpulse < schema.sql

CREATE DATABASE IF NOT EXISTS sentimentpulse
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sentimentpulse;

CREATE TABLE IF NOT EXISTS users (
  id           VARCHAR(36)  NOT NULL PRIMARY KEY,
  name         VARCHAR(255) NOT NULL,
  email        VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role         ENUM('admin','member','viewer') NOT NULL DEFAULT 'admin',
  avatar_color VARCHAR(50)  NOT NULL DEFAULT 'indigo',
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workspaces (
  id         VARCHAR(36)  NOT NULL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  slug       VARCHAR(255) NOT NULL UNIQUE,
  owner_id   VARCHAR(36)  NOT NULL,
  created_at DATE         NOT NULL DEFAULT (CURDATE()),
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workspace_members (
  id               VARCHAR(36)  NOT NULL PRIMARY KEY,
  workspace_id     VARCHAR(36)  NOT NULL,
  user_id          VARCHAR(36),
  name             VARCHAR(255),
  email            VARCHAR(255) NOT NULL,
  role             ENUM('admin','member','viewer') NOT NULL DEFAULT 'member',
  status           ENUM('active','pending')        NOT NULL DEFAULT 'pending',
  workspace_access JSON,
  survey_access    JSON,
  avatar_color     VARCHAR(50)  NOT NULL DEFAULT 'teal',
  joined_at        DATE,
  invited_at       DATE         NOT NULL DEFAULT (CURDATE()),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS surveys (
  id           VARCHAR(36)  NOT NULL PRIMARY KEY,
  workspace_id VARCHAR(36)  NOT NULL,
  title        VARCHAR(500) NOT NULL,
  description  TEXT,
  submissions  INT          NOT NULL DEFAULT 0,
  endpoint     VARCHAR(255),
  status       ENUM('live','paused','draft') NOT NULL DEFAULT 'draft',
  created_at   DATE         NOT NULL DEFAULT (CURDATE()),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS questions (
  id          VARCHAR(36)  NOT NULL PRIMARY KEY,
  survey_id   VARCHAR(36)  NOT NULL,
  type        VARCHAR(50)  NOT NULL,
  label       TEXT         NOT NULL,
  options     JSON,
  required    TINYINT(1)   NOT NULL DEFAULT 0,
  help_text   TEXT,
  max_rating  INT          NOT NULL DEFAULT 5,
  low_label   VARCHAR(255),
  high_label  VARCHAR(255),
  order_index INT          NOT NULL DEFAULT 0,
  FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS feedback (
  id          VARCHAR(36)  NOT NULL PRIMARY KEY,
  survey_id   VARCHAR(36)  NOT NULL,
  text        TEXT         NOT NULL,
  sentiment   ENUM('positive','neutral','critical','negative') NOT NULL,
  score       INT          NOT NULL DEFAULT 0,
  tags        JSON,
  received_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE
);
