const { randomUUID: uuidv4 } = require("crypto");
const pool = require("../db");

// Appends first 8 chars of the workspace ID to guarantee global uniqueness
// even when two users pick the same workspace name.
function makeSlug(name, id) {
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${base}-${id.slice(0, 8)}`;
}

async function list(req, res) {
  const [rows] = await pool.query(
    "SELECT id, name, slug, created_at AS createdAt FROM workspaces WHERE owner_id = ? ORDER BY created_at ASC",
    [req.user.id]
  );
  res.json(rows);
}

async function create(req, res) {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: "Workspace name is required." });

  const id    = uuidv4();
  const slug  = makeSlug(name, id);
  const today = new Date().toISOString().slice(0, 10);

  await pool.query(
    "INSERT INTO workspaces (id, name, slug, owner_id, created_at) VALUES (?, ?, ?, ?, ?)",
    [id, name.trim(), slug, req.user.id, today]
  );
  res.status(201).json({ id, name: name.trim(), slug, createdAt: today });
}

async function rename(req, res) {
  const { id } = req.params;
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: "Workspace name is required." });

  const [rows] = await pool.query("SELECT id FROM workspaces WHERE id = ? AND owner_id = ?", [id, req.user.id]);
  if (rows.length === 0) return res.status(404).json({ error: "Workspace not found." });

  const slug = makeSlug(name, id);
  await pool.query("UPDATE workspaces SET name = ?, slug = ? WHERE id = ?", [name.trim(), slug, id]);
  res.json({ ok: true, name: name.trim(), slug });
}

async function remove(req, res) {
  const { id } = req.params;
  const [rows] = await pool.query("SELECT id FROM workspaces WHERE id = ? AND owner_id = ?", [id, req.user.id]);
  if (rows.length === 0) return res.status(404).json({ error: "Workspace not found." });

  // Count remaining workspaces so we don't delete the last one
  const [countRows] = await pool.query("SELECT COUNT(*) AS cnt FROM workspaces WHERE owner_id = ?", [req.user.id]);
  if (countRows[0].cnt <= 1) return res.status(400).json({ error: "Cannot delete your only workspace." });

  await pool.query("DELETE FROM workspaces WHERE id = ? AND owner_id = ?", [id, req.user.id]);
  res.json({ ok: true });
}

module.exports = { list, create, rename, remove };
