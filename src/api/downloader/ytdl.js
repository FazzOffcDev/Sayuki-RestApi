/**
 * YouTube Downloader (ytmp4 / ytmp3) via Nekolabs API
 */
const axios = require('axios')

module.exports =  function (app, prefix = "") {
  // YTMP4
  app.get(`${prefix}/download/ytmp4`, async (req, res) => {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ success: false, message: "Parameter ?url= wajib" });
    }

    try {
      const api = `https://api.nekolabs.my.id/downloader/youtube/v2?url=${encodeURIComponent(url)}`;
      const response = await axios.get(api);

      if (!response.data?.status) {
        return res.status(404).json({ success: false, message: "Gagal mengambil data" });
      }

      // Filter hanya video/mp4
      const mp4Formats = response.data.result.medias.filter(m => m.ext === "mp4");

      res.json({
        success: true,
        source: "youtube",
        type: "mp4",
        title: response.data.result.title,
        thumbnail: response.data.result.thumbnail,
        duration: response.data.result.duration,
        formats: mp4Formats
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // YTMP3 (ambil audio saja)
  app.get(`${prefix}/download/ytmp3`, async (req, res) => {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ success: false, message: "Parameter ?url= wajib" });
    }

    try {
      const api = `https://api.nekolabs.my.id/downloader/youtube/v2?url=${encodeURIComponent(url)}`;
      const response = await axios.get(api);

      if (!response.data?.status) {
        return res.status(404).json({ success: false, message: "Gagal mengambil data" });
      }

      // Filter audio (kadang format audio ditandai is_audio = true)
      const audioFormats = response.data.result.medias.filter(m => m.is_audio);

      res.json({
        success: true,
        source: "youtube",
        type: "mp3",
        title: response.data.result.title,
        thumbnail: response.data.result.thumbnail,
        duration: response.data.result.duration,
        formats: audioFormats
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
}
