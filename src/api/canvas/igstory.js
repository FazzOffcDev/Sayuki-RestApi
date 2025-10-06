const axios = require("axios");
const sharp = require("sharp");
const { createCanvas, loadImage } = require("canvas");
module.exports = function (app, prefix = "") {
app.get(`${prefix}/canvas/igstory`, async (req, res) => {
  const {
    username = "b4mzciIIIIIII",
    text = "Hallo Sayuki 💫",
    avatar = "https://i.ibb.co.com/PGMBpZJF/icon.webp"
  } = req.query;

  try {
    const width = 720;
    const height = 1280;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);

    // 🧩 Ambil avatar dan ubah ke PNG (biar node-canvas bisa baca)
    const avatarRes = await axios.get(avatar, { responseType: "arraybuffer" });
    const pngBuffer = await sharp(avatarRes.data).png().toBuffer();
    const pfp = await loadImage(pngBuffer);

    const avatarSize = 80;
    const avatarX = 50;
    const avatarY = 60;

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(pfp, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    ctx.fillStyle = "#fff";
    ctx.font = "30px Arial";
    ctx.textAlign = "left";
    ctx.fillText(username, avatarX + avatarSize + 30, avatarY + avatarSize / 1.5);

    ctx.font = "bold 50px Arial";
    ctx.textAlign = "center";
    const lines = wrapText(ctx, text, width - 200);
    lines.forEach((line, i) => ctx.fillText(line, width / 2, height / 2 + i * 60));

    ctx.font = "40px Arial";
    ctx.fillText("🔊", width - 60, height - 50);

    res.setHeader("Content-Type", "image/png");
    res.send(canvas.toBuffer("image/png"));
  } catch (err) {
    console.error("❌ IG Story Canvas Error:", err);
    res.status(500).json({ status: false, message: err.message });
  }
});
}