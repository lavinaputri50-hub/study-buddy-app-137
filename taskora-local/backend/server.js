require("dotenv").config();
const express = require("express");
const cors = require("cors");

const pool = require("./db");
const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");
const taskRoutes = require("./routes/tasks");
const scheduleRoutes = require("./routes/schedules");

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/schedules", scheduleRoutes);

app.use((_req, res) => res.status(404).json({ message: "Endpoint tidak ditemukan" }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Terjadi kesalahan pada server" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Taskora API berjalan di http://localhost:${PORT}`));
