const { randomUUID: uuidv4 } = require("crypto");
const pool = require("../db");

async function getSurvey(req, res) {
  const { surveyId } = req.params;
  const [surveys] = await pool.query(
    "SELECT id, title, description, status FROM surveys WHERE id = ?",
    [surveyId]
  );
  if (surveys.length === 0 || surveys[0].status === "draft") {
    return res.status(404).json({ error: "Survey not found." });
  }
  const s = surveys[0];
  if (s.status === "paused") return res.status(410).json({ error: "This survey is currently paused." });

  const [qs] = await pool.query(
    "SELECT id, type, label, options, required, help_text AS helpText, max_rating AS maxRating, low_label AS lowLabel, high_label AS highLabel FROM questions WHERE survey_id = ? ORDER BY order_index ASC",
    [s.id]
  );
  s.questions = qs.map((q) => ({ ...q, options: q.options ? JSON.parse(q.options) : [] }));
  res.json(s);
}

async function submitResponse(req, res) {
  const { surveyId } = req.params;
  const [surveys] = await pool.query("SELECT id, status FROM surveys WHERE id = ?", [surveyId]);
  if (surveys.length === 0 || surveys[0].status !== "live") {
    return res.status(404).json({ error: "Survey not available." });
  }

  // Increment submission counter
  await pool.query("UPDATE surveys SET submissions = submissions + 1 WHERE id = ?", [surveyId]);

  // In a real system you'd run sentiment analysis here.
  // We store the raw response and assign a placeholder sentiment.
  const { answers } = req.body; // { questionId: value, ... }
  const text = Object.values(answers || {}).filter(Boolean).join(" | ");
  const id   = uuidv4();

  await pool.query(
    "INSERT INTO feedback (id, survey_id, text, sentiment, score, tags) VALUES (?, ?, ?, 'neutral', 50, '[]')",
    [id, surveyId, text || "(no text)"]
  );

  res.status(201).json({ ok: true });
}

module.exports = { getSurvey, submitResponse };
