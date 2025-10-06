const axios = require('axios');

/**
 * Endpoint Discovery: Pencarian File S-File
 */
module.exports = function (app, prefix = '') {
  app.get(`${prefix}/search/sfile`, async (req, res) => {
    const { q } = req.query;

    // Validasi parameter 'q' (query pencarian)
    if (!q) {
      return res.status(400).json({
        status: false,
        code: 400,
        message: "Parameter 'q' (query pencarian file S-File) wajib diisi."
      });
    }

    try {
      // URL API eksternal yang Anda sediakan
      const externalUrl = `https://api.nekolabs.my.id/discovery/sfile/search?q=${encodeURIComponent(q)}`;

      // Melakukan request ke server eksternal
      const response = await axios.get(externalUrl);
      
      // Mengembalikan response data langsung ke klien
      res.json(response.data);

    } catch (error) {
      console.error("SFILE API ERROR:", error.message);
      
      const status = error.response ? error.response.status : 500;
      let errorMessage = "Kesalahan tak terduga saat melakukan pencarian S-File.";

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