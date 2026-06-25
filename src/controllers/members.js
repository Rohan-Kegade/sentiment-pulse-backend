const { randomUUID: uuidv4 } = require("crypto");
const pool = require("../db");

const AVATAR_COLORS = ["indigo", "teal", "amber", "rose", "violet", "slate"];

async function assertWorkspaceOwner(workspaceId, userId) {
  const [rows] = await pool.query("SELECT id FROM workspaces WHERE id = ? AND owner_id = ?", [workspaceId, userId]);
  return rows.length > 0;
}

async function list(req, res) {
  const { workspaceId } = req.params;
  if (!(await assertWorkspaceOwner(workspaceId, req.user.id))) {
    return res.status(403).json({ error: "Access denied." });
  }
  const [rows] = await pool.query(
    `SELECT id, workspace_id AS workspaceId, user_id AS userId, name, email, role, status,
            workspace_access AS workspaceAccess, survey_access AS surveyAccess,
            avatar_color AS avatarColor, joined_at AS joinedAt, invited_at AS invitedAt
     FROM workspace_members WHERE workspace_id = ? ORDER BY invited_at DESC`,
    [workspaceId]
  );
  const result = rows.map((r) => ({
    ...r,
    workspaceAccess: r.workspaceAccess ? JSON.parse(r.workspaceAccess) : null,
    surveyAccess:    r.surveyAccess    ? JSON.parse(r.surveyAccess)    : null,
  }));
  res.json(result);
}

async function invite(req, res) {
  const { workspaceId } = req.params;
  const { email, role } = req.body;
  if (!email || !role) return res.status(400).json({ error: "email and role are required." });
  if (!(await assertWorkspaceOwner(workspaceId, req.user.id))) {
    return res.status(403).json({ error: "Access denied." });
  }

  const [existing] = await pool.query(
    "SELECT id FROM workspace_members WHERE workspace_id = ? AND email = ?",
    [workspaceId, email]
  );
  if (existing.length > 0) return res.status(409).json({ error: "Member already invited." });

  const id      = uuidv4();
  const today   = new Date().toISOString().slice(0, 10);
  const [allMembers] = await pool.query("SELECT id FROM workspace_members WHERE workspace_id = ?", [workspaceId]);
  const color   = AVATAR_COLORS[allMembers.length % AVATAR_COLORS.length];

  await pool.query(
    "INSERT INTO workspace_members (id, workspace_id, name, email, role, status, avatar_color, invited_at) VALUES (?, ?, NULL, ?, ?, 'pending', ?, ?)",
    [id, workspaceId, email, role, color, today]
  );
  res.status(201).json({ id, workspaceId, name: null, email, role, status: "pending", avatarColor: color, invitedAt: today, joinedAt: null, workspaceAccess: null, surveyAccess: null });
}

async function update(req, res) {
  const { memberId } = req.params;
  const { role, status } = req.body;
  const [rows] = await pool.query(
    `SELECT wm.id FROM workspace_members wm
     JOIN workspaces w ON w.id = wm.workspace_id
     WHERE wm.id = ? AND w.owner_id = ?`,
    [memberId, req.user.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: "Member not found." });

  const updates = [];
  const params  = [];
  if (role)   { updates.push("role = ?");   params.push(role); }
  if (status) { updates.push("status = ?"); params.push(status); }
  if (updates.length === 0) return res.status(400).json({ error: "Nothing to update." });
  params.push(memberId);
  await pool.query(`UPDATE workspace_members SET ${updates.join(", ")} WHERE id = ?`, params);
  res.json({ ok: true });
}

async function remove(req, res) {
  const { memberId } = req.params;
  const [rows] = await pool.query(
    `SELECT wm.id FROM workspace_members wm
     JOIN workspaces w ON w.id = wm.workspace_id
     WHERE wm.id = ? AND w.owner_id = ?`,
    [memberId, req.user.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: "Member not found." });
  await pool.query("DELETE FROM workspace_members WHERE id = ?", [memberId]);
  res.json({ ok: true });
}

module.exports = { list, invite, update, remove };
