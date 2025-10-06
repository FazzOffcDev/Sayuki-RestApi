/**
 * AI Image Generator - Animagine XL 3.1 (Nekolabs)
 * Response langsung gambar
 */
module.exports = function (app, prefix = '') {
  const axios = require("axios");

  // Endpoint: GET /endpoint/ai/animagine?prompt=...&ratio=...
  app.get(`${prefix}/ai/animagine`, async (req, res) => {
    const { prompt, ratio } = req.query;
    if (!prompt) {
      return res.status(400).json({ status: false, error: "Query ?prompt= is required" });
    }

    try {
      // Panggil API Nekolabs
      const apiRes = await axios.get("https://api.nekolabs.my.id/ai/animagine/xl-3.1", {
        params: { prompt, ratio: ratio || "1:1" }
      });

      if (!apiRes.data.status || !apiRes.data.result) {
        return res.status(500).json({ status: false, error: "Gagal generate image" });
      }

      // Ambil URL gambar dari result
      const imageUrl = apiRes.data.result;

      // Fetch image binary
      const imgRes = await axios.get(imageUrl, { responseType: "arraybuffer" });

      // Kirim langsung sebagai response image
      res.set("Content-Type", "image/png");
      res.send(imgRes.data);
    } catch (error) {
      res.status(500).json({ status: false, error: error.message });
    }
  });
};
