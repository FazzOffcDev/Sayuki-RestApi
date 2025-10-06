const axios = require('axios');

/**
 * Endpoint Stalking: TikTok User Profile
 */
module.exports = function (app, prefix = '') {
  app.get(`${prefix}/stalk/tiktok`, async (req, res) => {
    // TikTok menggunakan parameter 'username'
    const { username } = req.query;

    // Validasi parameter 'username'
    if (!username) {
      return res.status(400).json({
        status: false,
        code: 400,
        message: "Parameter 'username' (TikTok username/ID) wajib diisi."
      });
    }

    try {
      // URL API eksternal yang disesuaikan untuk TikTok
      const externalUrl = `https://api.siputzx.my.id/api/stalk/tiktok?username=${encodeURIComponent(username)}`;

      // Melakukan request ke server eksternal
      const response = await axios.get(externalUrl);
      
      // Mengembalikan response data langsung ke klien
      res.json(response.data);

    } catch (error) {
      console.error("TIKTOK STALK API ERROR:", error.message);
      
      const status = error.response ? error.response.status : 500;
      let errorMessage = "Kesalahan tak terduga saat mengambil data TikTok.";

      if (status === 404) {
          errorMessage = `Pengguna TikTok dengan username "${username}" tidak ditemukan.`;
      } else if (error.response && error.response.data && error.response.data.message) {
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