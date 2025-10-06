/**
 * Spotify Downloader (via Nekolabs API)
 */
module.exports = function (app, prefix = '') {
  const axios = require("axios");

  app.get(`${prefix}/download/spotify`, async (req, res) => {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ status: false, message: "Parameter ?q= wajib" });
    }

    try {
      const response = await axios.get("https://api.nekolabs.my.id/downloader/spotify/play/v1", {
        params: { q }
      });

      res.json(response.data);
    } catch (err) {
      console.error("Spotify Downloader ERROR:", err.response?.data || err.message);
      res.status(500).json({ status: false, error: err.response?.data || err.message });
    }
  });
};
