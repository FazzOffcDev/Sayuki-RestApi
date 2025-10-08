const axios = require('axios');

/**
 * Endpoint Daftar Provinsi: Mengambil daftar semua provinsi di Indonesia.
 * Mengambil data dari API eksternal.
 */
module.exports = function (app, prefix = '') {
  
  // Catatan: Gunakan base URL yang stabil. URL ini digunakan sebagai pola.
  const EXTERNAL_BASE_URL = 'http://loscos4w40ko04sss0cg0wo4.70.153.72.107.sslip.io';

  /**
   * GET /province
   */
  app.get(`${prefix}/province`, async (req, res) => {
    try {
      // 1. Konstruksi URL eksternal
      const externalUrl = `${EXTERNAL_BASE_URL}/province`;

      console.log(`[PROVINCES LIST] Mengambil data dari: ${externalUrl}`);

      // 2. Melakukan request ke server eksternal
      const response = await axios.get(externalUrl);
      
      const data = response.data; // Data adalah array penuh dari objek provinsi

      // 3. Memproses dan membersihkan hasil
      const cleanedProvinces = data.map(province => ({
          id: province.id,
          name: province.name,
          slug: province.slug,
          // Secara opsional, hitung jumlah kota tanpa mengembalikan detail kota 
          // (Anda bisa pilih mengembalikan array 'cities' secara penuh jika diperlukan)
          total_cities: province.cities ? province.cities.length : 0,
          // Hapus array cities dari output agar lebih ringkas, atau sertakan jika dibutuhkan
          // cities: province.cities 
      }));

      // 4. Membuat struktur respons akhir
      const finalResponse = {
          status: true,
          code: 200,
          total_provinces: cleanedProvinces.length,
          result: cleanedProvinces
      };
      
      // 5. Mengembalikan response data
      res.json(finalResponse);

    } catch (error) {
      console.error("[PROVINCES LIST API ERROR]:", error.message);
      
      const status = error.response ? error.response.status : 500;
      let errorMessage = "Kesalahan tak terduga saat mengambil daftar provinsi.";
      
      if (error.response && error.response.data && error.response.data.message) {
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