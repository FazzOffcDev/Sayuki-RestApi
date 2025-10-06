/**
 * /api/canvas/igstoryv2
 * Instagram Story Generator v2 — gradient blur background + timer + custom text/user/avatar
 */

const { createCanvas, loadImage, registerFont } = require("canvas");
const path = require("path");

module.exports = function (app, prefix = "") {
  app.get(`${prefix}/canvas/igstoryv2`, async (req, res) => {
    const {
      username = "sayuki.ai",
      text = "✨ Welcome to Sayuki Story Mode ✨",
      avatar = "https://i.ibb.co.com/PGMBpZJF/icon.webp",
      progress = 0.6 // 0.0 → 1.0
    } = req.query;

    try {
      const width = 720;
      const height = 1280;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      // 🌈 Gradient background with blur effect
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "rgba(255, 0, 150, 0.25)");
      gradient.addColorStop(1, "rgba(0, 200, 255, 0.25)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Efek blur transparan layer gelap
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.fillRect(0, 0, width, height);

      // 🧠 Font setup
      registerFont(path.join(__dirname, "../../assets/font/Poppins-SemiBold.ttf"), { family: "Poppins" });

      // 🎥 Progress bar timer di atas
      const progressWidth = width * Math.min(Math.max(parseFloat(progress), 0), 1);
      const barHeight = 8;
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
      ctx.fillRect(0, 0, width, barHeight);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, progressWidth, barHeight);

      // 👤 Foto profil (bulat)
      const pfp = await loadImage(avatar);
      const avatarSize = 90;
      const avatarX = 40;
      const avatarY = 40;
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(pfp, avatarX, avatarY, avatarSize, avatarSize);
      ctx.restore();

      // 🧾 Username
      ctx.fillStyle = "#fff";
      ctx.font = "32px Poppins";
      ctx.textAlign = "left";
      ctx.fillText(username, avatarX + avatarSize + 30, avatarY + avatarSize / 1.5);

      // ✍️ Text di tengah layar (auto-wrap)
      ctx.font = "bold 52px Poppins";
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      const lines = wrapText(ctx, text, width - 160);
      const startY = height / 2 - ((lines.length - 1) * 60) / 2;
      lines.forEach((line, i) => {
        ctx.fillText(line, width / 2, startY + i * 65);
      });

      // 🔊 Icon volume di kanan bawah
      ctx.font = "42px Poppins";
      ctx.textAlign = "right";
      ctx.fillText("🔊", width - 40, height - 50);

      // 💾 Kirim hasil
      res.setHeader("Content-Type", "image/png");
      res.send(canvas.toBuffer("image/png"));
    } catch (err) {
      res.status(500).json({
        status: false,
        message: err.message,
      });
    }
  });
};

// 🧩 Fungsi auto-wrap text
function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + " " + word).width;
    if (width < maxWidth) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}
