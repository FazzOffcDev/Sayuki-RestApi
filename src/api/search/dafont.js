/**
 * DaFont Scraper
 * Menyediakan fungsi untuk mencari font di DaFont dan mendapatkan link download langsung.
 */
module.exports = function (app, prefix = '') {
  const cheerio = require('cheerio');
  const axios = require('axios');
  
  const BASE_URL = 'https://www.dafont.com';

  /**
   * Mencari font berdasarkan query di DaFont.
   * @param {string} query Kata kunci pencarian font.
   * @returns {Promise<Array>} Array hasil pencarian.
   */
  async function dafontSearch(query) {
    if (!query) {
      throw new Error("Query pencarian tidak boleh kosong.");
    }
    
    // Panggilan untuk pencarian
    const res = await axios.get(`${BASE_URL}/search.php?q=${encodeURIComponent(query)}`);
    const $ = cheerio.load(res.data);
    const hasil = [];

    // Mengambil total hasil (dapat disalahpahami jika format teks berubah, tapi kita pertahankan)
    let totalText = $('div.dffont2').text().trim();
    const totalMatch = totalText.match(/(\d+) fonts on DaFont/);
    const total = totalMatch ? totalMatch[1] : 'Unknown';

    // Looping melalui setiap hasil font
    $('div.preview').each(function() {
      const card = $(this).closest('div.container').find('div.dfbg'); // Mencari container terdekat yang memiliki metadata
      
      const link = `${BASE_URL}/` + $(this).find('a').attr('href');
      
      // dfbg memiliki lv1left (judul) dan lv1right (style/author)
      const judul = card.find('div.lv1left.dfbg').text().trim(); 
      const style = card.find('div.lv1right.dfbg').text().trim();
      
      // Hanya push jika judul valid
      if (judul) {
        hasil.push({ judul, style, link, total });
      }
    });

    // Menggunakan Set untuk menghapus duplikasi yang mungkin terjadi akibat looping bertumpuk yang salah di kode asli.
    // Kode asli: Looping bertingkat pada div.preview dan div.lv1left/lv1right menyebabkan hasil terduplikasi.
    // Kita menggunakan logika cheerio yang lebih langsung di atas, tetapi kita tetap filter hasilnya.
    const uniqueResults = [];
    const seenLinks = new Set();
    
    hasil.forEach(item => {
        if (!seenLinks.has(item.link)) {
            seenLinks.add(item.link);
            uniqueResults.push(item);
        }
    });

    return uniqueResults;
  }

  /**
   * Mengambil link download langsung dari halaman font.
   * @param {string} link URL halaman font yang spesifik.
   * @returns {Promise<object>} Objek berisi metadata dan link download.
   */
  async function dafontDown(link) {
    if (!link || !link.startsWith(BASE_URL)) {
        throw new Error("Link unduhan tidak valid atau bukan dari DaFont.");
    }

    const des = await axios.get(link);
    const $ = cheerio.load(des.data);
    
    const judul = $('div.lv1left.dfbg').text().trim();
    const style = $('div.lv1right.dfbg').text().trim();
    
    // Mencari link download dari tombol biru
    const downPath = $('div.dlbox a').attr('href');
    if (!downPath) {
        throw new Error("Link download tidak ditemukan. Font mungkin memerlukan donasi atau telah dihapus.");
    }

    const down = 'http:' + downPath; // DaFont menggunakan protokol relatif, kita tambahkan http:

    // Mencari nama file dalam kurung (biasanya di samping judul)
    let filename = '';
    const spanText = $('div.container > div > span').text();
    const nameMatch = spanText.match(/\((.*?)\)/); 
    if (nameMatch) {
        filename = nameMatch[1]; 
    } else {
        // Jika tidak ada nama file spesifik, gunakan format judul.zip
        filename = judul.replace(/[^a-zA-Z0-9]/g, '_') + '.zip';
    }

    return {
        judul, 
        style, 
        down, // Link download final (.zip)
        filename: filename // Estimasi nama file di dalam zip
    };
  }


  // --- ENDPOINT 1: SEARCH ---
  app.get(`${prefix}/search/dafont`, async (req, res) => {
    const { q } = req.query; 

    if (!q) {
        return res.status(400).json({
            status: false,
            code: 400,
            message: "Parameter ?q= wajib diisi dengan kata kunci pencarian font."
        });
    }

    try {
      console.log(`[DaFont Scraper] Mencari font: ${q}`);
      const result = await dafontSearch(q);
      
      res.json({
          status: true,
          code: 200,
          message: `Ditemukan ${result.length} hasil untuk "${q}" (Total Estimasi: ${result[0]?.total || 'Unknown'}).`,
          results: result
      });

    } catch (err) {
      console.error("[DaFont Scraper] ERROR:", err.message);
      res.status(500).json({
          status: false,
          error: err.message,
          message: `Gagal memproses pencarian DaFont.`
      });
    }
  });

  // --- ENDPOINT 2: DOWNLOAD ---
  app.get(`${prefix}/download/dafont`, async (req, res) => {
    const { link } = req.query; 

    if (!link) {
        return res.status(400).json({
            status: false,
            code: 400,
            message: "Parameter ?link= wajib diisi dengan URL halaman font dari hasil pencarian DaFont."
        });
    }

    try {
      console.log(`[DaFont Downloader] Mendapatkan link download untuk: ${link}`);
      const result = await dafontDown(link);
      
      res.json({
          status: true,
          code: 200,
          message: `Link download untuk font "${result.judul}" berhasil didapatkan.`,
          result: result
      });

    } catch (err) {
      console.error("[DaFont Downloader] ERROR:", err.message);
      res.status(500).json({
          status: false,
          error: err.message,
          message: `Gagal memproses unduhan DaFont.`
      });
    }
  });
};
