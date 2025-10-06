/**
 * MediaFire Downloader
 * Ambil direct link dari URL MediaFire
 */
module.exports = function (app, prefix = '') {
  const axios = require("axios");
  const cheerio = require("cheerio");

  app.get(`${prefix}/download/mediafire`, async (req, res) => {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ success: false, message: "Parameter ?url= wajib" });
    }

    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);

      // cari elemen tombol download
      const link = $("#downloadButton").attr("href");
      const filename = $(".filename").text().trim() || null;
      const filesize = $(".details").first().text().trim() || null;

      if (!link) {
        return res.status(404).json({ success: false, message: "Gagal menemukan link download" });
      }

      res.json({
        success: true,
        filename,
        filesize,
        download: link
      });
    } catch (err) {
      console.error("MediaFire ERROR:", err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });
};
