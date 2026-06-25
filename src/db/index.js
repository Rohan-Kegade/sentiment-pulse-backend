const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT || "3306"),
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
});

// mysql2 auto-parses JSON columns into JS objects; this helper handles both
// cases (already parsed object OR raw string) plus null gracefully.
function safeJson(val, fallback) {
  if (val == null) return fallback;
  if (typeof val !== "string") return val; // already parsed by mysql2
  try { return JSON.parse(val); } catch { return fallback; }
}

module.exports = pool;
module.exports.safeJson = safeJson;
