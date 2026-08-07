const express = require("express");
const pool = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();
router.use(auth);

const PRIORITIES = ["high", "medium", "low"];

router.get("/", async (req, res, next) => {
  try {
    const { status, priority } = req.query;
    let sql = "SELECT * FROM tasks WHERE user_id = ?";
    const values = [req.userId];
    if (status === "done") sql += " AND is_done = 1";
    if (status === "pending") sql += " AND is_done = 0";
    if (PRIORITIES.includes(priority)) {
      sql += " AND priority = ?";
      values.push(priority);
    }
    sql += " ORDER BY is_done ASC, deadline IS NULL, deadline ASC, created_at DESC";
    const [rows] = await pool.query(sql, values);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get("/stats/summary", async (req, res, next) => {
  try {
    const [[stats]] = await pool.query(
      `SELECT COUNT(*) AS total,
              SUM(is_done = 1) AS completed,
              SUM(is_done = 0) AS pending
       FROM tasks WHERE user_id = ?`,
      [req.userId],
    );
    const total = Number(stats.total) || 0;
    const completed = Number(stats.completed) || 0;
    res.json({
      total,
      completed,
      pending: Number(stats.pending) || 0,
      progress: total ? Math.round((completed / total) * 100) : 0,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT * FROM tasks WHERE id = ? AND user_id = ?", [
      req.params.id,
      req.userId,
    ]);
    if (!rows.length) return res.status(404).json({ message: "Tugas tidak ditemukan" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { title, description, deadline, priority } = req.body || {};
    if (!title) return res.status(400).json({ message: "Judul tugas wajib diisi" });
    const prio = PRIORITIES.includes(priority) ? priority : "medium";

    const [result] = await pool.query(
      "INSERT INTO tasks (user_id, title, description, deadline, priority) VALUES (?, ?, ?, ?, ?)",
      [req.userId, title, description || null, deadline || null, prio],
    );
    const [rows] = await pool.query("SELECT * FROM tasks WHERE id = ?", [result.insertId]);

    await pool.query("INSERT INTO notifications (user_id, task_id, message) VALUES (?, ?, ?)", [
      req.userId,
      result.insertId,
      `Tugas baru ditambahkan: ${title}`,
    ]);

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const { title, description, deadline, priority, is_done } = req.body || {};
    const fields = [];
    const values = [];
    if (title !== undefined) (fields.push("title = ?"), values.push(title));
    if (description !== undefined) (fields.push("description = ?"), values.push(description));
    if (deadline !== undefined) (fields.push("deadline = ?"), values.push(deadline || null));
    if (priority !== undefined && PRIORITIES.includes(priority)) {
      fields.push("priority = ?");
      values.push(priority);
    }
    if (is_done !== undefined) (fields.push("is_done = ?"), values.push(is_done ? 1 : 0));
    if (!fields.length) return res.status(400).json({ message: "Tidak ada data untuk diubah" });

    values.push(req.params.id, req.userId);
    const [result] = await pool.query(
      `UPDATE tasks SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`,
      values,
    );
    if (!result.affectedRows) return res.status(404).json({ message: "Tugas tidak ditemukan" });

    const [rows] = await pool.query("SELECT * FROM tasks WHERE id = ?", [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const [result] = await pool.query("DELETE FROM tasks WHERE id = ? AND user_id = ?", [
      req.params.id,
      req.userId,
    ]);
    if (!result.affectedRows) return res.status(404).json({ message: "Tugas tidak ditemukan" });
    res.json({ message: "Tugas dihapus" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
