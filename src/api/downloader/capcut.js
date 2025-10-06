/**
 * Capcut Downloader via Nekolabs API
 */
const axios = require('axios')

module.exports =  function (app, prefix = "") {
  app.get(`${prefix}/download/capcut`, async (req, res) => {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ success: false, message: "Parameter ?url= wajib" });
    }

    try {
      const api = `https://api.nekolabs.my.id/downloader/capcut?url=${encodeURIComponent(url)}`;
      const response = await axios.get(api);

      if (!response.data?.status) {
        return res.status(404).json({ success: false, message: "Gagal mengambil data" });
      }

      res.json({
        success: true,
        source: "capcut",
        title: response.data.result.title,
        author: response.data.result.author,
        videoUrl: response.data.result.videoUrl
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ success: false, message: err.message });
    }
  });
}
