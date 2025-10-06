/**
 * Facebook Downloader via Nekolabs API
 */
const axios = require('axios')

module.exports =  function (app, prefix = "") {
  app.get(`${prefix}/download/facebook`, async (req, res) => {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ success: false, message: "Parameter ?url= wajib" });
    }

    try {
      const api = `https://api.nekolabs.my.id/downloader/facebook?url=${encodeURIComponent(url)}`;
      const response = await axios.get(api);

      if (!response.data?.status) {
        return res.status(404).json({ success: false, message: "Gagal mengambil data" });
      }

      // Normalisasi respon
      res.json({
        success: true,
        source: "facebook",
        title: response.data.result.title,
        medias: response.data.result.medias.map(m => ({
          quality: m.quality,
          type: m.type,
          extension: m.extension,
          url: m.url
        }))
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ success: false, message: err.message });
    }
  });
}
