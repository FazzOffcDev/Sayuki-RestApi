const axios = require('axios');

/**
 * Endpoint Jadwal Sholat: Mengambil jadwal sholat bulanan berdasarkan 
 * koordinat (latitude dan longitude) dari API eksternal.
 */
module.exports = function (app, prefix = '') {
  
  // URL ini digunakan sebagai pola berdasarkan contoh Anda.
  const EXTERNAL_BASE_URL = 'http://loscos4w40ko04sss0cg0wo4.70.153.72.107.sslip.io';

  /**
   * GET /prayer?latitude={latitude}&longitude={longitude}
   * Contoh: /prayer?latitude=-8.53695&longitude=115.4029722222222
   */
  app.get(`${prefix}/prayer`, async (req, res) => {
    const { latitude, longitude } = req.query;

    // 1. Validasi parameter koordinat
    if (!latitude || !longitude || isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
      return res.status(400).json({
        status: false,
        code: 400,
        message: "Parameter 'latitude' dan 'longitude' wajib diisi dan harus berupa angka."
      });
    }

    try {
      // 2. Konstruksi URL eksternal dengan query parameters
      const externalUrl = `${EXTERNAL_BASE_URL}/prayer?latitude=${latitude}&longitude=${longitude}`;

      console.log(`[PRAYER SCHEDULE] Mengambil data dari: ${externalUrl}`);

      // 3. Melakukan request ke server eksternal
      const response = await axios.get(externalUrl);
      
      const data = response.data; // Data adalah objek detail kota dan jadwal sholat

      // 4. Memproses dan membersihkan hasil
      const finalResponse = {
          status: true,
          code: 200,
          query_coordinates: {
              latitude: parseFloat(latitude),
              longitude: parseFloat(longitude)
          },
          city_info: {
              id: data.id,
              name: data.name,
              province_name: data.province.name,
              coordinate: data.coordinate
          },
          total_schedules: data.prayers ? data.prayers.length : 0,
          schedule: data.prayers
      };
      
      // 5. Mengembalikan response data
      res.json(finalResponse);

    } catch (error) {
      console.error("[PRAYER API ERROR]:", error.message);
      
      const status = error.response ? error.response.status : 500;
      let errorMessage = "Kesalahan tak terduga saat mengambil jadwal sholat.";
      
      if (status === 404) {
          errorMessage = "Data jadwal sholat tidak ditemukan untuk koordinat tersebut.";
      } else if (error.response && error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
      }
      
      // Mengembalikan response error yang terstruktur
      res.status(status).json({
        status: false,
        code: status,
        message: errorMessage
      });
    }
  });
};