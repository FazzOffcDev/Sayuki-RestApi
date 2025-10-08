const axios = require('axios');

/**
 * Endpoint Berita CNN Indonesia: Mengambil daftar berita terbaru 
 * dari CNN Indonesia dari API eksternal.
 */
module.exports = function (app, prefix = '') {
  
  // URL API eksternal yang Anda sediakan
  const EXTERNAL_URL = 'https://berita-indo-api-next.vercel.app/api/cnn-news';

  /**
   * GET /news/cnn
   * Contoh: /news/cnn
   */
  app.get(`${prefix}/news/cnnall`, async (req, res) => {
    try {
      console.log(`[CNN NEWS] Mengambil data dari: ${EXTERNAL_URL}`);

      // 1. Melakukan request ke server eksternal
      const response = await axios.get(EXTERNAL_URL);
      
      const data = response.data; // Data adalah objek lengkap dari API berita

      // 2. Memproses dan menyusun hasil
      const cleanedData = data.data.map(news => ({
          title: news.title,
          link: news.link,
          snippet: news.contentSnippet,
          published_at: news.isoDate,
          images: {
              small: news.image.small,
              large: news.image.large
          }
      }));

      // 3. Membuat struktur respons akhir
      const finalResponse = {
          status: true,
          code: 200,
          source: "CNN Indonesia",
          message: data.messages || "Berhasil mengambil data berita.",
          total_results: cleanedData.length,
          result: cleanedData
      };
      
      // 4. Mengembalikan response data
      res.json(finalResponse);

    } catch (error) {
      console.error("[CNN NEWS API ERROR]:", error.message);
      
      const status = error.response ? error.response.status : 500;
      let errorMessage = "Kesalahan tak terduga saat mengambil daftar berita CNN Indonesia.";
      
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