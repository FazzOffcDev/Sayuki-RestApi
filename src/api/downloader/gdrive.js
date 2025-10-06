const axios = require('axios');

/**
 * Endpoint Downloader: Google Drive Downloader
 */
module.exports = function (app, prefix = '') {
  app.get(`${prefix}/download/gdrive`, async (req, res) => {
    const { url } = req.query;

    // 1. Validasi parameter 'url'
    if (!url) {
      return res.status(400).json({
        status: false,
        code: 400,
        message: "Parameter 'url' (link share Google Drive) wajib diisi."
      });
    }

    // 2. Validasi format URL Google Drive
    if (!url.match(/drive\.google\.com|googledrive\.com/i)) {
      return res.status(400).json({
        status: false,
        code: 400,
        message: "URL tidak valid. Masukkan link share Google Drive yang benar (contoh: https://drive.google.com/file/d/XXXXXX/view)"
      });
    }

    try {
      // URL API eksternal yang Anda sediakan
      const externalUrl = `https://api.nekolabs.my.id/downloader/google-drive?url=${encodeURIComponent(url)}`;
      
      // Melakukan request ke server eksternal
      const response = await axios.get(externalUrl);
      
      // Mengembalikan response data langsung ke klien
      res.json(response.data);

    } catch (error) {
      console.error("GOOGLE DRIVE DOWNLOADER API ERROR:", error.message);
      
      // Menggunakan status dan pesan dari API eksternal jika tersedia
      const status = error.response ? error.response.status : 500;
      let errorMessage = "Kesalahan tak terduga saat mencoba mendownload dari Google Drive.";

      if (error.response && error.response.data) {
          // Jika respons dari API eksternal adalah JSON dengan pesan error
          if (error.response.data.message) {
              errorMessage = error.response.data.message;
          } else if (typeof error.response.data === 'string') {
              // Menangkap respons non-JSON (HTML/Teks biasa)
              errorMessage = `API eksternal mengembalikan error non-JSON. Status: ${status}`;
          }
      }
      
      // Mengembalikan response error
      res.status(status).json({
        status: false,
        code: status,
        message: errorMessage
      });
    }
  });
};