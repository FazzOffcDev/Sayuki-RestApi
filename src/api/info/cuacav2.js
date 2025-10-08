/**
 * /api/weather
 * Fitur cuaca yang mengambil data prakiraan dari openapi.de4a.space
 * Format respons: status, lokasi, dan daftar cuaca harian
 */

const axios = require("axios");

module.exports = function (app, prefix = "") {
  app.get(`${prefix}/weatherv2`, async (req, res) => {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        status: false,
        message: "Parameter 'lat' dan 'lon' wajib diisi."
      });
    }

    try {
      // 🔗 Panggil API eksternal (BMKG via de4a.space)
      const url = `https://openapi.de4a.space/api/weather/forecast?lat=${lat}&long=${lon}`;
      const { data } = await axios.get(url, {
        headers: {
          "User-Agent": "Sayuki-Weather-Agent/1.0"
        },
        timeout: 15000
      });

      if (!data || !data.data || !data.data[0]) {
        throw new Error("Data cuaca tidak ditemukan.");
      }

      const info = data.data[0];
      const location = info.location;
      const weatherList = info.weather.flat();

      // 🎯 Rapikan data untuk output API kamu
      const forecast = weatherList.map((w) => ({
        waktu_local: w.local_datetime,
        suhu: `${w.t}°C`,
        kelembapan: `${w.hu}%`,
        deskripsi: w.weather_desc,
        arah_angin: w.wd,
        kecepatan_angin: `${w.ws} m/s`,
        jarak_pandang: w.vs_text,
        icon: w.image,
      }));

      res.json({
        status: true,
        message: "success",
        lokasi: {
          provinsi: location.province,
          kota: location.city,
          kecamatan: location.subdistrict,
          kelurahan: location.village,
          koordinat: {
            latitude: location.latitude,
            longitude: location.longitude
          }
        },
        prakiraan: forecast.slice(0, 10) // tampilkan 10 jam ke depan
      });
    } catch (err) {
      console.error("Weather API Error:", err.message);
      res.status(500).json({
        status: false,
        message: "Gagal mengambil data cuaca.",
        error: err.message
      });
    }
  });
};
