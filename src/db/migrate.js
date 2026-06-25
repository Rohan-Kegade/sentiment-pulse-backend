const pool = require("./index");

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id            VARCHAR(36)  NOT NULL PRIMARY KEY,
    name          VARCHAR(255) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          ENUM('admin','member','viewer') NOT NULL DEFAULT 'admin',
    plan          ENUM('free','pro','enterprise') NOT NULL DEFAULT 'free',
    avatar_color  VARCHAR(50)  NOT NULL DEFAULT 'indigo',
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS workspaces (
    id         VARCHAR(36)  NOT NULL PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    slug       VARCHAR(255) NOT NULL,
    owner_id   VARCHAR(36)  NOT NULL,
    created_at DATE         NOT NULL,
    UNIQUE KEY uq_ws_owner_slug (owner_id, slug),
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS workspace_members (
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
    invited_at       DATE         NOT NULL,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS surveys (
    id           VARCHAR(36)  NOT NULL PRIMARY KEY,
    workspace_id VARCHAR(36)  NOT NULL,
    title        VARCHAR(500) NOT NULL,
    description  TEXT,
    submissions  INT          NOT NULL DEFAULT 0,
    endpoint     VARCHAR(255),
    status       ENUM('live','paused','draft') NOT NULL DEFAULT 'draft',
    created_at   DATE         NOT NULL,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS questions (
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS feedback (
    id          VARCHAR(36)  NOT NULL PRIMARY KEY,
    survey_id   VARCHAR(36)  NOT NULL,
    text        TEXT         NOT NULL,
    sentiment   ENUM('positive','neutral','critical','negative') NOT NULL,
    score       INT          NOT NULL DEFAULT 0,
    tags        JSON,
    received_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

async function fixIndexes(conn) {
  // Old schema had UNIQUE(slug) globally; correct constraint is UNIQUE(owner_id, slug).
  try {
    await conn.query("ALTER TABLE workspaces DROP INDEX slug");
  } catch (_) {}
  try {
    await conn.query("ALTER TABLE workspaces ADD UNIQUE KEY uq_ws_owner_slug (owner_id, slug)");
  } catch (_) {}
  // Add plan column to existing users tables that were created without it.
  try {
    await conn.query("ALTER TABLE users ADD COLUMN plan ENUM('free','pro','enterprise') NOT NULL DEFAULT 'free' AFTER role");
  } catch (_) {}
}

async function migrate() {
  const conn = await pool.getConnection();
  try {
    for (const sql of STATEMENTS) {
      await conn.query(sql);
    }
    await fixIndexes(conn);
    console.log("Database tables verified / created.");
  } finally {
    conn.release();
  }
}

module.exports = migrate;
