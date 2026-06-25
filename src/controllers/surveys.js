const { randomUUID: uuidv4 } = require("crypto");
const pool = require("../db");
const { safeJson } = require("../db");

async function assertWorkspaceOwner(workspaceId, userId) {
  const [rows] = await pool.query(
    "SELECT id FROM workspaces WHERE id = ? AND owner_id = ?",
    [workspaceId, userId]
  );
  return rows.length > 0;
}

async function listByWorkspace(req, res) {
  const { workspaceId } = req.params;
  if (!(await assertWorkspaceOwner(workspaceId, req.user.id))) {
    return res.status(403).json({ error: "Access denied." });
  }

  const [surveys] = await pool.query(
    "SELECT id, workspace_id AS workspaceId, title, description, submissions, endpoint, status, created_at AS createdAt FROM surveys WHERE workspace_id = ? ORDER BY created_at DESC",
    [workspaceId]
  );

  for (const s of surveys) {
    const [qs] = await pool.query(
      "SELECT id, type, label, options, required, help_text AS helpText, max_rating AS maxRating, low_label AS lowLabel, high_label AS highLabel FROM questions WHERE survey_id = ? ORDER BY order_index ASC",
      [s.id]
    );
    s.questions = qs.map((q) => ({ ...q, options: safeJson(q.options, []) }));
  }

  res.json(surveys);
}

async function create(req, res) {
  const { workspaceId, title, description, questions, status, endpoint } = req.body;

  if (!(await assertWorkspaceOwner(workspaceId, req.user.id))) {
    return res.status(403).json({ error: "Access denied." });
  }

  const id    = uuidv4();
  const today = new Date().toISOString().slice(0, 10);
  const slug  = Math.random().toString(36).slice(2, 8);
  const ep    = endpoint || `pulse.sh/r/${slug}`;

  await pool.query(
    "INSERT INTO surveys (id, workspace_id, title, description, submissions, endpoint, status, created_at) VALUES (?, ?, ?, ?, 0, ?, ?, ?)",
    [id, workspaceId, title || "Untitled Survey", description || "", ep, status || "draft", today]
  );

  if (Array.isArray(questions) && questions.length > 0) {
    await saveQuestions(id, questions);
  }

  res.status(201).json({ id, workspaceId, title, description, submissions: 0, endpoint: ep, status: status || "draft", createdAt: today, questions: questions || [] });
}

async function update(req, res) {
  const { id } = req.params;
  const [surveyRows] = await pool.query(
    "SELECT s.id, s.workspace_id FROM surveys s JOIN workspaces w ON w.id = s.workspace_id WHERE s.id = ? AND w.owner_id = ?",
    [id, req.user.id]
  );
  if (surveyRows.length === 0) return res.status(404).json({ error: "Survey not found." });

  const { title, description, status, questions } = req.body;
  const updates = [];
  const params  = [];
  if (title       !== undefined) { updates.push("title = ?");       params.push(title); }
  if (description !== undefined) { updates.push("description = ?"); params.push(description); }
  if (status      !== undefined) { updates.push("status = ?");      params.push(status); }

  if (updates.length > 0) {
    params.push(id);
    await pool.query(`UPDATE surveys SET ${updates.join(", ")} WHERE id = ?`, params);
  }

  if (Array.isArray(questions)) {
    await pool.query("DELETE FROM questions WHERE survey_id = ?", [id]);
    if (questions.length > 0) await saveQuestions(id, questions);
  }

  res.json({ ok: true });
}

async function remove(req, res) {
  const { id } = req.params;
  const [rows] = await pool.query(
    "SELECT s.id FROM surveys s JOIN workspaces w ON w.id = s.workspace_id WHERE s.id = ? AND w.owner_id = ?",
    [id, req.user.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: "Survey not found." });
  await pool.query("DELETE FROM surveys WHERE id = ?", [id]);
  res.json({ ok: true });
}

async function saveQuestions(surveyId, questions) {
  const values = questions.map((q, i) => [
    q.id || uuidv4(),
    surveyId,
    q.type,
    q.label || "",
    JSON.stringify(q.options || []),
    q.required ? 1 : 0,
    q.helpText || null,
    q.maxRating || 5,
    q.lowLabel  || null,
    q.highLabel || null,
    i,
  ]);
  await pool.query(
    "INSERT INTO questions (id, survey_id, type, label, options, required, help_text, max_rating, low_label, high_label, order_index) VALUES ?",
    [values]
  );
}

module.exports = { listByWorkspace, create, update, remove };
