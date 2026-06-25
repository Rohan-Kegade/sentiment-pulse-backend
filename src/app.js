const express = require("express");
const cors    = require("cors");
const helmet  = require("helmet");

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: false,
}));
app.use(express.json());

app.use("/api/auth",       require("./routes/auth"));
app.use("/api/workspaces", require("./routes/workspaces"));
app.use("/api/surveys",    require("./routes/surveys"));
app.use("/api/feedback",   require("./routes/feedback"));
app.use("/api/members",    require("./routes/members"));
app.use("/api/public",     require("./routes/public"));

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error." });
});

module.exports = app;
