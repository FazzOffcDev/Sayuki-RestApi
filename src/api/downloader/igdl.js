/**
 * Instagram Downloader (via Nekolabs API)
 */
module.exports = function (app, prefix = '') {
  const axios = require("axios");

  app.get(`${prefix}/download/instagram`, async (req, res) => {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ status: false, message: "Parameter ?url= wajib" });
    }

    try {
      const response = await axios.get("https://api.nekolabs.my.id/downloader/instagram", {
        params: { url }
      });

      res.json(response.data);
    } catch (err) {
      console.error("Instagram Downloader ERROR:", err.response?.data || err.message);
      res.status(500).json({ status: false, error: err.response?.data || err.message });
    }
  });
};
