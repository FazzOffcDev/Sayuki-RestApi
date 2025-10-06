/**
 * /api/canvas/chatbubblev2
 * Chat bubble ala WhatsApp/iMessage dengan efek glass, emoji reaction, dan jam.
 */

const { createCanvas, loadImage, registerFont } = require("canvas");
const path = require("path");

module.exports = function (app, prefix = "") {
  app.get(`${prefix}/canvas/chatbubblev2`, async (req, res) => {
    const {
      text = "Hallo 👋",
      username = "Sayuki",
      time = new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      avatar = "https://i.ibb.co/0mYBq4R/avatar.png"
    } = req.query;

    try {
      const width = 720;
      const height = 300;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      // 🌌 Background lembut
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#0d1117");
      gradient.addColorStop(1, "#1b2735");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // 🖼️ Profil
      const pfp = await loadImage(avatar);
      const avatarSize = 80;
      ctx.save();
      ctx.beginPath();
      ctx.arc(80, 150, avatarSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(pfp, 40, 110, avatarSize, avatarSize);
      ctx.restore();

      // 💬 Bubble dengan efek glassmorphism
      const bubbleX = 150;
      const bubbleY = 100;
      const bubbleW = ctx.measureText(text).width + 150;
      const bubbleH = 100;
      const radius = 25;

      // Shadow lembut
      ctx.shadowColor = "rgba(0,255,255,0.2)";
      ctx.shadowBlur = 10;

      // Glass bubble
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

      // Efek glass
      const glass = ctx.createLinearGradient(bubbleX, bubbleY, bubbleX, bubbleY + bubbleH);
      glass.addColorStop(0, "rgba(255,255,255,0.12)");
      glass.addColorStop(1, "rgba(255,255,255,0.06)");
      ctx.fillStyle = glass;
      ctx.fill();

      // ✍️ Teks
      registerFont(path.join(__dirname, "../../assets/font/Poppins-SemiBold.ttf"), { family: "Poppins" });
      ctx.font = "28px Poppins";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(text, bubbleX + 30, bubbleY + bubbleH / 2);

      // 🕓 Waktu kecil di bawah bubble
      ctx.font = "20px Poppins";
      ctx.fillStyle = "rgba(200,200,200,0.7)";
      ctx.textAlign = "right";
      ctx.fillText(time, bubbleX + bubbleW - 30, bubbleY + bubbleH + 30);

      // 😍 Emoji reaction bar
      const emojis = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
      const emojiStartX = bubbleX + bubbleW / 2 - (emojis.length * 30) / 2;
      emojis.forEach((e, i) => {
        ctx.font = "30px Poppins";
        ctx.fillText(e, emojiStartX + i * 40, bubbleY - 15);
      });

      // ✅ Kirim hasil
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
