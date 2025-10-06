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

      // Background hitam
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, width, height);

      // Foto profil
      const pfp = await loadImage(avatar);
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

      // Username
      ctx.fillStyle = "#fff";
      ctx.font = "30px Arial";
      ctx.textAlign = "left";
      ctx.fillText(username, avatarX + avatarSize + 30, avatarY + avatarSize / 1.5);

      // Text di tengah
      ctx.font = "bold 50px Arial";
      ctx.textAlign = "center";
      const lines = wrapText(ctx, text, width - 200);
      lines.forEach((line, i) => {
        ctx.fillText(line, width / 2, height / 2 + i * 60);
      });

      // Icon volume
      ctx.font = "40px Arial";
      ctx.fillText("🔊", width - 60, height - 50);

      res.setHeader("Content-Type", "image/png");
      res.send(canvas.toBuffer("image/png"));
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  });
};

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
