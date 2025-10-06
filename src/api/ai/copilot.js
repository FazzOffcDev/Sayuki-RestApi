/**
 * AI Copilot (via Nekolabs API)
 */
module.exports = function (app, prefix = '') {
  const axios = require("axios");

  app.get(`${prefix}/ai/copilot`, async (req, res) => {
    const { text } = req.query;
    if (!text) {
      return res.status(400).json({ status: false, message: "Parameter ?text= wajib" });
    }

    try {
      const response = await axios.get("https://api.nekolabs.my.id/ai/copilot", {
        params: { text }
      });

      res.json(response.data);
    } catch (err) {
      console.error("AI Copilot ERROR:", err.response?.data || err.message);
      res.status(500).json({ status: false, error: err.response?.data || err.message });
    }
  });
};
