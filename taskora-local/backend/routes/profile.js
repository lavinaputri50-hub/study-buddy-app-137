const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();
router.use(auth);

router.get("/", async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, email, avatar_url, language, theme, created_at FROM users WHERE id = ?",
      [req.userId],
    );
    if (!rows.length) return res.status(404).json({ message: "User tidak ditemukan" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put("/", async (req, res, next) => {
  try {
    const { name, email, password, avatar_url, language, theme } = req.body || {};
    const fields = [];
    const values = [];

    if (name !== undefined) (fields.push("name = ?"), values.push(name));
    if (email !== undefined) (fields.push("email = ?"), values.push(email));
    if (avatar_url !== undefined) (fields.push("avatar_url = ?"), values.push(avatar_url || null));
    if (language !== undefined) (fields.push("language = ?"), values.push(language));
    if (theme !== undefined) (fields.push("theme = ?"), values.push(theme));
    if (password) {
      fields.push("password = ?");
      values.push(await bcrypt.hash(password, 10));
    }
    if (!fields.length) return res.status(400).json({ message: "Tidak ada data untuk diubah" });

    values.push(req.userId);
    await pool.query(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);

    const [rows] = await pool.query(
      "SELECT id, name, email, avatar_url, language, theme FROM users WHERE id = ?",
      [req.userId],
    );
    res.json(rows[0]);
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Email sudah dipakai akun lain" });
    }
    next(err);
  }
});

module.exports = router;
