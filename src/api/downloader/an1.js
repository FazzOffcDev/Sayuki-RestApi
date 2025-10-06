const axios = require('axios');

/**
 * Endpoint Downloader: AN1 Downloader (Menggunakan URL Halaman Aplikasi)
 */
module.exports = function (app, prefix = '') {
  app.get(`${prefix}/download/android1`, async (req, res) => {
    const { url } = req.query;

    // 1. Validasi parameter 'url'
    if (!url) {
      return res.status(400).json({
        status: false,
        code: 400,
        message: "Parameter 'url' (link halaman aplikasi AN1.com) wajib diisi."
      });
    }

    // 2. Validasi format URL AN1.com
    if (!url.match(/an1\.com/i)) {
      return res.status(400).json({
        status: false,
        code: 400,
        message: "URL tidak valid. Masukkan link halaman aplikasi AN1.com (contoh: https://an1.com/XXXXX-nama-aplikasi-mod.html)"
      });
    }

    try {
      // URL API eksternal yang Anda sediakan
      const externalUrl = `https://api.nekolabs.my.id/downloader/android1?url=${encodeURIComponent(url)}`;
      
      // Melakukan request ke server eksternal
      const response = await axios.get(externalUrl);
      
      // Mengembalikan response data langsung ke klien
      res.json(response.data);

    } catch (error) {
      console.error("AN1 DOWNLOADER API ERROR:", error.message);
      
      const status = error.response ? error.response.status : 500;
      let errorMessage = "Kesalahan tak terduga saat mencoba mendownload dari AN1.";

      if (error.response && error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
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