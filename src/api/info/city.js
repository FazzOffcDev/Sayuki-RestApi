const axios = require('axios');

/**
 * Endpoint Daftar Kota/Kabupaten Provinsi: Mengambil daftar kota/kabupaten 
 * berdasarkan ID Provinsi dari API eksternal.
 */
module.exports = function (app, prefix = '') {
  
  // URL ini digunakan sebagai pola berdasarkan contoh Anda.
  const EXTERNAL_BASE_URL = 'http://loscos4w40ko04sss0cg0wo4.70.153.72.107.sslip.io';

  /**
   * GET /province/:provinceId/city
   * Contoh: /province/67fe1456a32be2ab743ff554/city
   */
  app.get(`${prefix}/province/:provinceId/city`, async (req, res) => {
    const provinceId = req.params.provinceId;

    // 1. Validasi parameter ID
    if (!provinceId) {
      return res.status(400).json({
        status: false,
        code: 400,
        message: "Parameter 'provinceId' wajib diisi di path URL."
      });
    }

    try {
      // 2. Konstruksi URL eksternal
      const externalUrl = `${EXTERNAL_BASE_URL}/province/${provinceId}/city`;

      console.log(`[PROVINCE CITIES] Mengambil data dari: ${externalUrl}`);

      // 3. Melakukan request ke server eksternal
      const response = await axios.get(externalUrl);
      
      const data = response.data; // Data adalah array penuh dari objek kota/kabupaten

      // 4. Memproses dan membersihkan hasil
      const cleanedCities = data.map(city => ({
          id: city.id,
          name: city.name,
          slug: city.slug,
          province_id: city.provinceId,
          coordinate: city.coordinate
      }));

      // 5. Membuat struktur respons akhir
      const finalResponse = {
          status: true,
          code: 200,
          province_id: provinceId,
          total_cities: cleanedCities.length,
          result: cleanedCities
      };
      
      // 6. Mengembalikan response data
      res.json(finalResponse);

    } catch (error) {
      console.error("[PROVINCE CITIES API ERROR]:", error.message);
      
      const status = error.response ? error.response.status : 500;
      let errorMessage = "Kesalahan tak terduga saat mengambil daftar kota/kabupaten.";
      
      if (status === 404) {
          errorMessage = "Provinsi dengan ID tersebut tidak ditemukan di sumber eksternal, atau tidak memiliki data kota/kabupaten.";
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