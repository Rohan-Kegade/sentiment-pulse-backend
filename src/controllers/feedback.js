const { randomUUID: uuidv4 } = require("crypto");
const pool = require("../db");
const { safeJson } = require("../db");

async function listBySurvey(req, res) {
  const { surveyId } = req.params;
  const [rows] = await pool.query(
    `SELECT f.id, f.survey_id AS surveyId, f.text, f.sentiment, f.score, f.tags,
            DATE_FORMAT(f.received_at, '%Y-%m-%d %H:%i') AS receivedAt
     FROM feedback f
     JOIN surveys s ON s.id = f.survey_id
     JOIN workspaces w ON w.id = s.workspace_id
     WHERE f.survey_id = ? AND w.owner_id = ?
     ORDER BY f.received_at DESC`,
    [surveyId, req.user.id]
  );
  const result = rows.map((r) => ({ ...r, tags: safeJson(r.tags, []) }));
  res.json(result);
}

async function create(req, res) {
  const { surveyId } = req.params;
  const { text, sentiment, score, tags } = req.body;
  if (!text || !sentiment) return res.status(400).json({ error: "text and sentiment are required." });

  const id = uuidv4();
  await pool.query(
    "INSERT INTO feedback (id, survey_id, text, sentiment, score, tags) VALUES (?, ?, ?, ?, ?, ?)",
    [id, surveyId, text, sentiment, score || 0, JSON.stringify(tags || [])]
  );
  res.status(201).json({ id, surveyId, text, sentiment, score: score || 0, tags: tags || [], receivedAt: new Date().toISOString() });
}

module.exports = { listBySurvey, create };
