const axios = require('axios');

/**
 * Endpoint Stalking: GitHub User Profile
 */
module.exports = function (app, prefix = '') {
  app.get(`${prefix}/stalk/github`, async (req, res) => {
    const { user } = req.query;

    // Validasi parameter 'user'
    if (!user) {
      return res.status(400).json({
        status: false,
        code: 400,
        message: "Parameter 'user' (GitHub username) wajib diisi."
      });
    }

    try {
      // URL API eksternal yang Anda sediakan
      const externalUrl = `https://api.siputzx.my.id/api/stalk/github?user=${encodeURIComponent(user)}`;

      // Melakukan request ke server eksternal
      const response = await axios.get(externalUrl);
      
      // Mengembalikan response data langsung ke klien
      res.json(response.data);

    } catch (error) {
      console.error("GITHUB STALK API ERROR:", error.message);
      
      const status = error.response ? error.response.status : 500;
      let errorMessage = "Kesalahan tak terduga saat mengambil data GitHub.";

      if (status === 404) {
          errorMessage = `Pengguna GitHub "${user}" tidak ditemukan.`;
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