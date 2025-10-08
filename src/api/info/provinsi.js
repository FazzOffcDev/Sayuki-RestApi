const axios = require('axios');

/**
 * Endpoint Detail Provinsi: Mengambil data detail provinsi dan daftar kota/kabupatennya.
 * Mengambil data dari API eksternal.
 */
module.exports = function (app, prefix = '') {
  
  // Catatan: Gunakan base URL yang stabil jika ini adalah proyek produksi.
  // URL ini digunakan sebagai pola berdasarkan contoh Anda.
  const EXTERNAL_BASE_URL = 'http://loscos4w40ko04sss0cg0wo4.70.153.72.107.sslip.io';

  /**
   * GET /province/:provinceId
   * Contoh: /province/67fe1456a32be2ab743ff554
   */
  app.get(`${prefix}/province/id`, async (req, res) => {
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
      const externalUrl = `${EXTERNAL_BASE_URL}/province/${provinceId}`;

      console.log(`[PROVINCE] Mengambil data dari: ${externalUrl}`);

      // 3. Melakukan request ke server eksternal
      const response = await axios.get(externalUrl, {
          // Konfigurasi tambahan seperti timeout bisa ditambahkan di sini
      });
      
      const data = response.data;

      // 4. Memproses dan membersihkan hasil (opsional, tergantung kebutuhan)
      // Di sini kita hanya menambahkan status sukses dan mengembalikan data asli.
      const finalResponse = {
          status: true,
          code: 200,
          result: {
              id: data.id,
              name: data.name,
              slug: data.slug,
              total_cities: data.cities ? data.cities.length : 0,
              cities: data.cities // Mengembalikan daftar kota/kabupaten
          }
      };
      
      // 5. Mengembalikan response data
      res.json(finalResponse);

    } catch (error) {
      console.error("[PROVINCE API ERROR]:", error.message);
      
      const status = error.response ? error.response.status : 500;
      let errorMessage = "Kesalahan tak terduga saat mengambil detail provinsi.";
      
      if (status === 404) {
          errorMessage = "Provinsi dengan ID tersebut tidak ditemukan di sumber eksternal.";
      } else if (error.response && error.response.data && error.response.data.message) {
          // Coba ambil pesan error dari body response jika tersedia
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