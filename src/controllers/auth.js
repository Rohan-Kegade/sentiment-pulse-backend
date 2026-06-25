const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const { randomUUID: uuidv4 } = require("crypto");
const { validationResult } = require("express-validator");
const pool = require("../db");

const AVATAR_COLORS = ["indigo", "teal", "amber", "rose", "violet"];

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

async function register(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, email, password, tenantName } = req.body;
  const conn = await pool.getConnection();
  try {
    const [existing] = await conn.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId       = uuidv4();
    const color        = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    await conn.query(
      "INSERT INTO users (id, name, email, password_hash, role, avatar_color) VALUES (?, ?, ?, ?, 'admin', ?)",
      [userId, name, email, passwordHash, color]
    );

    let workspaces = [];
    if (tenantName) {
      const wsId   = uuidv4();
      const slug   = tenantName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const today  = new Date().toISOString().slice(0, 10);
      await conn.query(
        "INSERT INTO workspaces (id, name, slug, owner_id, created_at) VALUES (?, ?, ?, ?, ?)",
        [wsId, tenantName, slug, userId, today]
      );
      workspaces = [{ id: wsId, name: tenantName, slug, createdAt: today }];
    }

    const token = signToken(userId);
    res.status(201).json({
      token,
      user:       { id: userId, name, email, role: "admin", avatarColor: color },
      workspaces,
    });
  } finally {
    conn.release();
  }
}

async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;
  const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
  if (rows.length === 0) {
    return res.status(401).json({ error: "Invalid email or password." });
  }
  const user = rows[0];
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const [wsRows] = await pool.query(
    "SELECT id, name, slug, created_at AS createdAt FROM workspaces WHERE owner_id = ? ORDER BY created_at ASC",
    [user.id]
  );

  const token = signToken(user.id);
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, avatarColor: user.avatar_color },
    workspaces: wsRows,
  });
}

async function me(req, res) {
  const [rows] = await pool.query(
    "SELECT id, name, email, role, avatar_color AS avatarColor FROM users WHERE id = ?",
    [req.user.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: "User not found." });

  const [wsRows] = await pool.query(
    "SELECT id, name, slug, created_at AS createdAt FROM workspaces WHERE owner_id = ? ORDER BY created_at ASC",
    [req.user.id]
  );

  res.json({ user: rows[0], workspaces: wsRows });
}

async function updateProfile(req, res) {
  const { name, email } = req.body;
  const updates = [];
  const params  = [];
  if (name)  { updates.push("name = ?");  params.push(name); }
  if (email) { updates.push("email = ?"); params.push(email); }
  if (updates.length === 0) return res.status(400).json({ error: "Nothing to update." });
  params.push(req.user.id);
  await pool.query(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, params);
  res.json({ ok: true });
}

module.exports = { register, login, me, updateProfile };
