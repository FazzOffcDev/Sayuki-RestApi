const axios = require('axios');

/**
 * Endpoint Discovery: Pencarian Lagu Spotify
 */
module.exports = function (app, prefix = '') {
  app.get(`${prefix}/search/spotify`, async (req, res) => {
    const { q } = req.query;

    // Validasi parameter 'q' (query pencarian)
    if (!q) {
      return res.status(400).json({
        status: false,
        code: 400,
        message: "Parameter 'q' (query pencarian lagu Spotify) wajib diisi."
      });
    }

    try {
      // URL API eksternal yang Anda sediakan
      const externalUrl = `https://api.nekolabs.my.id/discovery/spotify/search?q=${encodeURIComponent(q)}`;

      // Melakukan request ke server eksternal
      const response = await axios.get(externalUrl);
      
      // Mengembalikan response data langsung ke klien
      res.json(response.data);

    } catch (error) {
      console.error("SPOTIFY API ERROR:", error.message);
      
      const status = error.response ? error.response.status : 500;
      let errorMessage = "Kesalahan tak terduga saat melakukan pencarian Spotify.";

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