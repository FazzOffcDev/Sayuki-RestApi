const axios = require('axios');

/**
 * Endpoint Detail Kota/Kabupaten: Mengambil data detail kota/kabupaten 
 * berdasarkan ID Provinsi dan ID Kota dari API eksternal.
 */
module.exports = function (app, prefix = '') {
  
  // URL ini digunakan sebagai pola berdasarkan contoh Anda.
  const EXTERNAL_BASE_URL = 'http://loscos4w40ko04sss0cg0wo4.70.153.72.107.sslip.io';

  /**
   * GET /province/:provinceId/city/:cityId
   * Contoh: /province/67fe1456a32be2ab743ff554/city/67fe1456a32be2ab743ff58d
   */
  app.get(`${prefix}/province/:provinceId/city/:cityId`, async (req, res) => {
    const provinceId = req.params.provinceId;
    const cityId = req.params.cityId;

    // 1. Validasi parameter ID
    if (!provinceId || !cityId) {
      return res.status(400).json({
        status: false,
        code: 400,
        message: "Parameter 'provinceId' dan 'cityId' wajib diisi di path URL."
      });
    }

    try {
      // 2. Konstruksi URL eksternal sesuai pola
      const externalUrl = `${EXTERNAL_BASE_URL}/province/${provinceId}/city/${cityId}`;

      console.log(`[CITY DETAIL] Mengambil data dari: ${externalUrl}`);

      // 3. Melakukan request ke server eksternal
      const response = await axios.get(externalUrl);
      
      const data = response.data; // Data adalah objek detail kota/kabupaten tunggal

      // 4. Memproses dan membersihkan hasil
      const finalResponse = {
          status: true,
          code: 200,
          result: {
              id: data.id,
              name: data.name,
              slug: data.slug,
              province_id: data.provinceId,
              coordinate: data.coordinate
          }
      };
      
      // 5. Mengembalikan response data
      res.json(finalResponse);

    } catch (error) {
      console.error("[CITY DETAIL API ERROR]:", error.message);
      
      const status = error.response ? error.response.status : 500;
      let errorMessage = "Kesalahan tak terduga saat mengambil detail kota/kabupaten.";
      
      if (status === 404) {
          errorMessage = "Kota/kabupaten dengan ID tersebut tidak ditemukan di sumber eksternal.";
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