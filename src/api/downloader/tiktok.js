/**
 * TikTok Scraper (via https://downloader.bot/api/tiktok/info)
 */
module.exports = function (app, prefix = '') {
  const axios = require("axios");

  /**
   * Mengambil informasi video TikTok menggunakan scraper.
   * @param {string} url - URL video TikTok.
   * @returns {Promise<object>} Objek berisi informasi video TikTok.
   */
  async function scrapeTikTok(url) {
    try {
      const res = await axios.post(
        "https://downloader.bot/api/tiktok/info",
        { url },
        {
          headers: {
            // Header yang disarankan untuk meniru permintaan yang valid
            "Accept": "application/json, text/plain, */*",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
          },
        }
      );

      const data = res.data.data;

      // Memastikan data yang diperlukan tersedia sebelum dikembalikan
      if (!data) {
          throw new Error("Respon dari scraper tidak mengandung data yang valid.");
      }

      return {
        username: data.nick,
        title: data.video_info,
        thumbnail: data.video_img,
        video: data.mp4, // Link video tanpa watermark
        audio: data.mp3,
        timestamp: data.video_date,
      };

    } catch (err) {
      // Menangani error yang mungkin terjadi, termasuk status HTTP non-200
      const errorMessage = err.response?.data?.message || err.message;
      console.error("TikTok Scraper ERROR:", errorMessage);
      throw new Error(`Gagal scrape TikTok: ${errorMessage}`);
    }
  }

  // Endpoint Express.js untuk fitur scraper TikTok
  app.get(`${prefix}/download/tiktok`, async (req, res) => {
    const { url } = req.query;
    
    // Validasi input
    if (!url) {
        return res.status(400).json({ 
            status: false, 
            code: 400,
            message: "Parameter ?url= wajib diisi dengan link video TikTok." 
        });
    }

    try {
      // Memanggil fungsi scraper
      const videoData = await scrapeTikTok(url);
      
      // Mengirimkan data hasil scrape ke client
      res.json({
          status: true,
          code: 200,
          result: videoData
      });

    } catch (err) {
      // Menangani error dari fungsi scrapeTikTok
      console.error("TikTok Scraper API Error:", err.message);
      res.status(500).json({ 
          status: false, 
          error: err.message,
          message: "Gagal memproses permintaan TikTok Scraper di server."
      });
    }
  });
};