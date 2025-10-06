const axios = require('axios');

/**
 * Endpoint Canvas: Meme Generator
 * Mengambil gambar, menambahkan teks atas dan bawah, dan mengembalikan gambar.
 */
module.exports = function (app, prefix = '') {
  app.get(`${prefix}/tools/meme`, async (req, res) => {
    const { imageUrl, textT, textB } = req.query;

    // Validasi parameter wajib
    if (!imageUrl || !textT || !textB) {
      return res.status(400).json({
        status: false,
        code: 400,
        message: "Parameter 'imageUrl', 'textT' (Teks Atas), dan 'textB' (Teks Bawah) wajib diisi."
      });
    }

    try {
      // URL API eksternal
      const externalUrl = `https://api.nekolabs.my.id/canvas/meme?imageUrl=${encodeURIComponent(imageUrl)}&textT=${encodeURIComponent(textT)}&textB=${encodeURIComponent(textB)}`;

      // Lakukan request dengan tipe response 'arraybuffer' untuk menangani data gambar/binary
      const response = await axios.get(externalUrl, { 
          responseType: 'arraybuffer' 
      });

      // Tentukan Content-Type dari response eksternal (biasanya image/jpeg atau image/png)
      const contentType = response.headers['content-type'];

      if (contentType && contentType.startsWith('image/')) {
        // Jika respon adalah gambar, kirimkan sebagai gambar
        res.setHeader('Content-Type', contentType);
        res.send(response.data);
      } else {
        // Jika API eksternal mengembalikan error dalam bentuk JSON/Teks, kirimkan sebagai error 500
        res.status(500).json({
          status: false,
          code: 500,
          message: "API eksternal gagal membuat meme. Respon bukan format gambar.",
          externalResponse: response.data.toString()
        });
      }

    } catch (error) {
      console.error("MEME API ERROR:", error.message);
      
      // Kirim pesan error yang jelas jika terjadi kegagalan koneksi atau 4xx/5xx dari eksternal
      res.status(500).json({
        status: false,
        code: 500,
        message: `Gagal mengakses API eksternal atau URL gambar salah. Error: ${error.message}`
      });
    }
  });
};