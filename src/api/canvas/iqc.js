/**
 * /api/canvas/chatbubble
 * Membuat gambar bubble chat dengan teks custom (seperti iMessage/WA)
 */

const { createCanvas, loadImage, registerFont } = require("canvas");
const path = require("path");

module.exports = function (app, prefix = "") {
  app.get(`${prefix}/canvas/chatbubble`, async (req, res) => {
    const { text = "Hallo" } = req.query;

    try {
      // Ukuran dasar
      const width = 600;
      const height = 200;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      // 🌌 Background gradasi elegan
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "#0d1117");
      gradient.addColorStop(1, "#1b2735");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // 🫧 Bubble Chat
      const bubbleX = 150;
      const bubbleY = 80;
      const bubbleW = ctx.measureText(text).width + 100;
      const bubbleH = 60;
      const radius = 25;

      ctx.beginPath();
      ctx.moveTo(bubbleX + radius, bubbleY);
      ctx.lineTo(bubbleX + bubbleW - radius, bubbleY);
      ctx.quadraticCurveTo(bubbleX + bubbleW, bubbleY, bubbleX + bubbleW, bubbleY + radius);
      ctx.lineTo(bubbleX + bubbleW, bubbleY + bubbleH - radius);
      ctx.quadraticCurveTo(bubbleX + bubbleW, bubbleY + bubbleH, bubbleX + bubbleW - radius, bubbleY + bubbleH);
      ctx.lineTo(bubbleX + radius, bubbleY + bubbleH);
      ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleH, bubbleX, bubbleY + bubbleH - radius);
      ctx.lineTo(bubbleX, bubbleY + radius);
      ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + radius, bubbleY);
      ctx.closePath();

      // Warna bubble & shadow
      ctx.fillStyle = "#212c3d";
      ctx.shadowColor = "rgba(0,255,255,0.4)";
      ctx.shadowBlur = 12;
      ctx.fill();

      // ✍️ Teks
      registerFont(path.join(__dirname, "../../assets/font/Poppins-SemiBold.ttf"), { family: "Poppins" });
      ctx.font = "26px Poppins";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, bubbleX + bubbleW / 2, bubbleY + bubbleH / 2);

      // 📦 Kirim hasil
      res.setHeader("Content-Type", "image/png");
      res.send(canvas.toBuffer("image/png"));
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  });
};
