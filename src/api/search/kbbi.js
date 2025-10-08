/**
 * KBBI Dictionary Search Scraper
 * Mencari arti kata dari Kamus Besar Bahasa Indonesia (KBBI) online.
 */
module.exports = function (app, prefix = '') {
  const cheerio = require('cheerio');
  const axios = require('axios');
  
  const BASE_URL = 'https://kbbi.kemdikbud.go.id/entri/';

  /**
   * Mencari arti kata di KBBI.
   * @param {string} kata - Kata kunci pencarian.
   * @returns {Promise<object>} Objek hasil pencarian KBBI.
   */
  async function kbbiSearch(kata) {
    if (!kata) {
      throw new Error("Kata kunci pencarian KBBI tidak boleh kosong.");
    }
    
    const url = `${BASE_URL}${encodeURIComponent(kata)}`;
    
    try {
        const { data } = await axios.get(url, {
            // Penting: Mengatur user-agent agar server KBBI tidak memblokir request.
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        const $ = cheerio.load(data);
        const lema = $('h2').first().text().trim();
        let arti = [];

        // Logika asli Anda mencoba dua set selector yang berbeda.
        // Coba selector pertama (untuk daftar berurut seperti 1., 2., 3.)
        $('ol > li').each((i, el) => {
            const text = $(el).text().trim();
            if (text) {
                // Hapus nomor urut dan spasi berlebih
                arti.push(text.replace(/^\d+\.\s*/, '').replace(/\s+/g, ' '));
            }
        });

        // Jika hasil pertama kosong, coba selector kedua (untuk daftar tanpa urut)
        if (arti.length === 0) {
             $('ul.adjusted-par > li').each((i, el) => {
                const text = $(el).text().trim();
                if (text) {
                    arti.push(text.replace(/\s+/g, ' '));
                }
            });
        }
        
        // Final check
        if (!lema || arti.length === 0) {
            // KBBI sering mengarahkan ke halaman hasil pencarian jika kata tidak ditemukan
            if ($('div.w-full.bg-white.py-20.text-center').length > 0) {
                throw new Error(`Kata "${kata}" tidak ditemukan dalam KBBI.`);
            }
            throw new Error(`Gagal mendapatkan arti atau arti tidak ada untuk kata "${kata}".`);
        }

        return {
            lema: lema,
            arti: arti
        };

    } catch (error) {
        // Cek jika error 404/403, yang mungkin disebabkan oleh limit
        if (axios.isAxiosError(error) && error.response && error.response.status >= 400) {
            throw new Error("Gagal terhubung ke KBBI (mungkin karena IP terkena limit atau masalah koneksi).");
        }
        throw error;
    }
  }

  // --- ENDPOINT EXPRESS.JS ---
  app.get(`${prefix}/info/kbbi`, async (req, res) => {
    const { q } = req.query; 

    if (!q) {
        return res.status(400).json({
            status: false,
            code: 400,
            message: "Parameter ?q= wajib diisi dengan kata yang ingin dicari."
        });
    }

    try {
      console.log(`[KBBI Search] Mencari: ${q}`);
      const results = await kbbiSearch(q);
      
      res.json({
          status: true,
          code: 200,
          message: `Arti kata "${q}" dari KBBI ditemukan.`,
          results: results
      });

    } catch (err) {
      let errorMessage = err.message || "Kesalahan tak terduga dalam memproses KBBI.";
      
      console.error("[KBBI Search] ERROR:", errorMessage);
      res.status(500).json({
          status: false,
          error: errorMessage,
          message: `Gagal memproses permintaan KBBI: ${errorMessage}`
      });
    }
  });
};
