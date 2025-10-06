/**
 * 🎮 Game Center API
 * Akses semua game seperti tebakkata, susunkata, tebakgambar, tebakkimia, tebakbendera, asahotak
 */

const fs = require("fs");
const path = require("path");

module.exports = function (app, prefix = "") {
  const gameFiles = {
    tebakkata: "../../../data/tebakkata.json",
    susunkata: "../../../data/susunkata.json",
    tebakgambar: "../../../data/tebakgambar.json",
    tebakkimia: "../../../data/tebakkimia.json",
    tebakbendera: "../../../data/tebakbendera.json",
    asahotak: "../../../data/asahotak.json"
  };

  // 📌 GET /api/games -> list semua kategori
  app.get(`${prefix}/games`, (req, res) => {
    res.json({
      status: true,
      message: "Daftar kategori game yang tersedia",
      available: Object.keys(gameFiles),
      example: `${prefix}/games/tebakkata`
    });
  });

  // 📌 GET /api/games/:type -> ambil soal acak dari file JSON
  app.get(`${prefix}/games/:type`, (req, res) => {
    const { type } = req.params;
    const fileName = gameFiles[type];

    if (!fileName)
      return res.status(404).json({
        status: false,
        message: `Game '${type}' tidak ditemukan.`,
        available: Object.keys(gameFiles)
      });

    const filePath = path.join(__dirname, fileName);

    if (!fs.existsSync(filePath))
      return res.status(500).json({ status: false, message: `File data untuk '${type}' tidak ditemukan.` });

    try {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      if (!Array.isArray(data) || data.length === 0)
        return res.status(500).json({ status: false, message: `Data game '${type}' kosong.` });

      const random = data[Math.floor(Math.random() * data.length)];
      res.json({
        status: true,
        type,
        data: random,
        total: data.length,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      res.status(500).json({ status: false, message: "Gagal memuat data game.", error: err.message });
    }
  });
};
