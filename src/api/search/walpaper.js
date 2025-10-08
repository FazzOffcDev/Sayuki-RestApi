/**
 * HD Wallpaper Search Scraper (BestHDWallpaper.com)
 * Mencari wallpaper berdasarkan query dan halaman.
 */
module.exports = function (app, prefix = '') {
  const cheerio = require('cheerio');
  const axios = require('axios');
  
  const BASE_URL = 'https://www.besthdwallpaper.com';

  /**
   * Melakukan pencarian wallpaper.
   * @param {string} title - Kata kunci pencarian.
   * @param {string} page - Nomor halaman.
   * @returns {Promise<Array>} Array hasil pencarian.
   */
  async function wallpaperSearch(title, page = '1') {
    if (!title) {
      throw new Error("Query pencarian (title) tidak boleh kosong.");
    }
    
    // URL API pencarian
    const url = `${BASE_URL}/search?CurrentPage=${page}&q=${encodeURIComponent(title)}`;
    
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const hasil = [];

        // Selector untuk setiap item wallpaper
        $('div.grid-item').each(function (i, el) {
            const $el = $(el);
            
            // Mengambil semua sumber gambar (data-src, srcset1, srcset2)
            const imgElement = $el.find('picture > img');
            const source1 = $el.find('picture > source:nth-child(1)').attr('srcset');
            const source2 = $el.find('picture > source:nth-child(2)').attr('srcset');

            hasil.push({
                title: $el.find('div.info > a > h3').text().trim(),
                type: $el.find('div.info > a:nth-child(2)').text().trim(),
                sourceUrl: BASE_URL + $el.find('div > a:nth-child(3)').attr('href'), // Link menuju halaman detail
                imageUrls: {
                    // Gambar utama, menggunakan data-src jika ada (lazy load) atau src
                    default: imgElement.attr('data-src') || imgElement.attr('src'),
                    highRes1: source1,
                    highRes2: source2
                }
            });
        });

        if (hasil.length === 0) {
            throw new Error(`Tidak ada hasil wallpaper ditemukan di halaman ${page} untuk query "${title}".`);
        }

        return hasil;

    } catch (error) {
        throw new Error(`Gagal melakukan scraping BestHDWallpaper: ${error.message}`);
    }
  }

  // --- ENDPOINT EXPRESS.JS ---
  app.get(`${prefix}/search/wallpaper`, async (req, res) => {
    const { q, page } = req.query; 
    const pageNum = page || '1';

    if (!q) {
        return res.status(400).json({
            status: false,
            code: 400,
            message: "Parameter ?q= wajib diisi dengan kata kunci wallpaper."
        });
    }

    try {
      console.log(`[Wallpaper Search] Mencari: ${q} (Halaman: ${pageNum})`);
      const results = await wallpaperSearch(q, pageNum);
      
      res.json({
          status: true,
          code: 200,
          message: `Ditemukan ${results.length} hasil wallpaper untuk "${q}" di halaman ${pageNum}.`,
          results: results
      });

    } catch (err) {
      let errorMessage = err.message || "Kesalahan tak terduga dalam memproses pencarian wallpaper.";
      
      console.error("[Wallpaper Search] ERROR:", errorMessage);
      res.status(500).json({
          status: false,
          error: errorMessage,
          message: `Gagal memproses permintaan Wallpaper Search: ${errorMessage}`
      });
    }
  });
};
