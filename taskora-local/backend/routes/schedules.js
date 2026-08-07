const express = require("express");
const pool = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();
router.use(auth);

router.get("/", async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM schedules WHERE user_id = ? ORDER BY day_of_week ASC, start_time ASC",
      [req.userId],
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { day_of_week, subject, start_time, end_time } = req.body || {};
    const day = Number(day_of_week);
    if (!subject || !start_time || !end_time || Number.isNaN(day) || day < 0 || day > 5) {
      return res.status(400).json({ message: "Data jadwal tidak lengkap atau tidak valid" });
    }
    const [result] = await pool.query(
      "INSERT INTO schedules (user_id, day_of_week, subject, start_time, end_time) VALUES (?, ?, ?, ?, ?)",
      [req.userId, day, subject, start_time, end_time],
    );
    const [rows] = await pool.query("SELECT * FROM schedules WHERE id = ?", [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const { day_of_week, subject, start_time, end_time } = req.body || {};
    const fields = [];
    const values = [];
    if (day_of_week !== undefined) (fields.push("day_of_week = ?"), values.push(Number(day_of_week)));
    if (subject !== undefined) (fields.push("subject = ?"), values.push(subject));
    if (start_time !== undefined) (fields.push("start_time = ?"), values.push(start_time));
    if (end_time !== undefined) (fields.push("end_time = ?"), values.push(end_time));
    if (!fields.length) return res.status(400).json({ message: "Tidak ada data untuk diubah" });

    values.push(req.params.id, req.userId);
    const [result] = await pool.query(
      `UPDATE schedules SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`,
      values,
    );
    if (!result.affectedRows) return res.status(404).json({ message: "Jadwal tidak ditemukan" });

    const [rows] = await pool.query("SELECT * FROM schedules WHERE id = ?", [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const [result] = await pool.query("DELETE FROM schedules WHERE id = ? AND user_id = ?", [
      req.params.id,
      req.userId,
    ]);
    if (!result.affectedRows) return res.status(404).json({ message: "Jadwal tidak ditemukan" });
    res.json({ message: "Jadwal dihapus" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
