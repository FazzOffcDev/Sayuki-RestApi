/**
 * MagicStudio - AI Art Generator
 * Example: /api/ai/magicstudio?prompt=portrait%20of%20a%20wizard%20with%20a%20long%20beard
 */

module.exports = function (app, prefix = '') {
  const axios = require("axios");

  app.get(`${prefix}/ai/magicstudio`, async (req, res) => {
    const { prompt } = req.query;

    if (!prompt) {
      return res.status(400).json({
        status: false,
        message: "Parameter ?prompt= wajib diisi"
      });
    }

    try {
      const response = await axios.get("https://api.siputzx.my.id/api/ai/magicstudio", {
        params: { prompt },
        responseType: "arraybuffer", // penting agar gambar tidak korup
      });

      // Set header agar browser langsung menampilkan gambar
      res.setHeader("Content-Type", "image/jpeg");
      res.send(Buffer.from(response.data, "binary"));
    } catch (err) {
      console.error("MagicStudio API ERROR:", err.response?.data || err.message);
      res.status(500).json({
        status: false,
        error: err.response?.data || err.message
      });
    }
  });
};
