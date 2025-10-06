/**
 * AI Chat (Nekolabs API)
 * Mirip struktur ytsearch
 */
module.exports = function (app, prefix = '') {
  const axios = require("axios");

  app.get(`${prefix}/ai/chat`, async (req, res) => {
    const { text } = req.query;
    if (!text) {
      return res.status(400).json({ status: false, error: "Query ?text= is required" });
    }

    try {
      const apiRes = await axios.get("https://api.nekolabs.my.id/ai/ai4chat", {
        params: { text }
      });

      // response asli sudah { status: true, result: "..." }
      res.status(200).json(apiRes.data);
    } catch (error) {
      res.status(500).json({ status: false, error: error.message });
    }
  });
};
