/**
 * HappyMod Search Scraper
 * Mencari aplikasi modifikasi berdasarkan query di HappyMod.com.
 */
module.exports = function (app, prefix = '') {
  const cheerio = require('cheerio');
  const axios = require('axios');
  
  const BASE_URL = 'https://www.happymod.com';

  /**
   * Melakukan pencarian di HappyMod.
   * @param {string} query Kata kunci pencarian.
   * @returns {Promise<Array>} Array hasil pencarian.
   */
  async function happymodSearch(query) {
    if (!query) {
      throw new Error("Query pencarian tidak boleh kosong.");
    }

    try {
      const url = `${BASE_URL}/search.html?q=${encodeURIComponent(query)}`;
      const { data } = await axios.get(url);
      const $ = cheerio.load(data);
      const hasil = [];

      // Selector untuk kotak aplikasi di hasil pencarian
      $("div.pdt-app-box").each(function(i, el) {
        const name = $(el).find("a").text().trim();
        // Menggunakan 'data-original' karena gambar dimuat secara lazy
        const icon = $(el).find("img.lazy").attr('data-original');
        const linkPath = $(el).find("a").attr('href');
        
        // Pastikan linkPath ada dan merupakan link relatif
        if (linkPath && linkPath.startsWith('/')) {
            const link = `${BASE_URL}${linkPath}`;
            
            hasil.push({
                icon: icon,
                name: name,
                link: link
            });
        }
      });
      
      if (hasil.length === 0) {
          throw new Error("Tidak ada hasil yang ditemukan untuk query ini.");
      }

      return hasil;

    } catch (error) {
      // Tangani error dari axios atau error custom di atas
      throw new Error(`Gagal melakukan pencarian HappyMod: ${error.message}`);
    }
  }

  // --- ENDPOINT EXPRESS.JS ---
  app.get(`${prefix}/search/happymod`, async (req, res) => {
    const { q } = req.query; 

    if (!q) {
        return res.status(400).json({
            status: false,
            code: 400,
            message: "Parameter ?q= wajib diisi dengan kata kunci aplikasi."
        });
    }

    try {
      console.log(`[HappyMod Search] Mencari: ${q}`);
      const results = await happymodSearch(q);
      
      res.json({
          status: true,
          code: 200,
          message: `Ditemukan ${results.length} hasil untuk "${q}" di HappyMod.`,
          results: results
      });

    } catch (err) {
      let errorMessage = err.message || "Kesalahan tak terduga dalam memproses HappyMod.";
      
      console.error("[HappyMod Search] ERROR:", errorMessage);
      res.status(500).json({
          status: false,
          error: errorMessage,
          message: `Gagal memproses permintaan HappyMod: ${errorMessage}`
      });
    }
  });
};
