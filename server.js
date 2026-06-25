require("dotenv").config();
const app     = require("./src/app");
const pool    = require("./src/db");
const migrate = require("./src/db/migrate");

const PORT = parseInt(process.env.PORT || "3001");

pool.getConnection()
  .then(async (conn) => {
    conn.release();
    await migrate();
    app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("Failed to connect to MySQL:", err.message);
    process.exit(1);
  });
