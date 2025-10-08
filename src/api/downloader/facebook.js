const axios = require('axios')

/**
 * Facebook Downloader via fbdown.vercel.app API
 */
module.exports =  function (app, prefix = "") {
  app.get(`${prefix}/download/facebook/fbdown`, async (req, res) => {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ 
        status: false, 
        code: 400, 
        message: "Parameter ?url= wajib diisi dengan link video Facebook." 
      });
    }

    try {
      // URL API eksternal baru
      const api = `https://fbdown.vercel.app/api/get?url=${encodeURIComponent(url)}`;
      console.log(`[FB Downloader V2] Mengambil data dari: ${api}`);

      const response = await axios.get(api);
      const resultData = response.data;
      
      const medias = [];

      // Proses link HD
      if (resultData.hd) {
          medias.push({
              quality: 'HD',
              type: 'video',
              extension: 'mp4', // Diasumsikan mp4 berdasarkan contoh
              url: resultData.hd
          });
      }

      // Proses link SD
      if (resultData.sd) {
          medias.push({
              quality: 'SD',
              type: 'video',
              extension: 'mp4', // Diasumsikan mp4 berdasarkan contoh
              url: resultData.sd
          });
      }

      // Cek jika tidak ada media yang ditemukan
      if (medias.length === 0) {
          return res.status(404).json({ 
              status: false, 
              code: 404,
              message: "Gagal menemukan link download HD atau SD untuk URL ini. Pastikan link video Facebook valid dan publik." 
          });
      }

      // Normalisasi respon
      res.json({
        status: true,
        code: 200,
        source: "Facebook Downloader (fbdown.vercel.app)",
        // Karena API ini tidak menyediakan 'title', kita hanya mengembalikan medias
        medias: medias
      });
    } catch (err) {
      console.error("[FB DOWNLOADER V2 ERROR]:", err.message);
      res.status(500).json({ 
          status: false, 
          code: 500,
          message: "Kesalahan tak terduga saat memproses video Facebook." 
      });
    }
  });
}