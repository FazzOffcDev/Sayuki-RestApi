const axios = require('axios');

/**
 * Endpoint Discovery: Prakiraan Cuaca 10 Hari (AccuWeather)
 */
module.exports = function (app, prefix = '') {
  app.get(`${prefix}/info/weather`, async (req, res) => {
    const { city } = req.query;

    // Validasi parameter 'city'
    if (!city) {
      return res.status(400).json({
        status: false,
        code: 400,
        message: "Parameter 'city' (nama kota) wajib diisi."
      });
    }

    try {
      // URL API eksternal yang Anda sediakan
      const externalUrl = `https://api.nekolabs.my.id/discovery/accuweather/search?city=${encodeURIComponent(city)}`;

      // Melakukan request ke server eksternal
      const response = await axios.get(externalUrl);
      
      // Mengembalikan response data langsung ke klien
      res.json(response.data);

    } catch (error) {
      console.error("ACCUWEATHER API ERROR:", error.message);
      
      const status = error.response ? error.response.status : 500;
      let errorMessage = "Kesalahan tak terduga saat mengambil data cuaca.";

      if (status === 404) {
          errorMessage = `Kota "${city}" tidak ditemukan atau layanan cuaca sedang sibuk.`;
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