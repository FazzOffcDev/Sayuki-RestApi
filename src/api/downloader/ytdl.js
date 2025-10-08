/**
 * YouTube Downloader via Y2Mate Scraper
 * Mengambil link download video YouTube (default 720p) dari y2mate.com
 */
module.exports = function (app, prefix = '') {
  const axios = require('axios');
  const cheerio = require('cheerio');
  
  // Regex untuk memvalidasi dan mengambil ID video YouTube
  const ytIdRegex = /(?:http(?:s|):\/\/|)(?:(?:www\.|)youtube(?:\-nocookie|)\.com\/(?:watch\?.*(?:|\&)v=|embed\/|v\/)|youtu\.be\/)([-_0-9A-Za-z]{11})/
  
  // URL dasar Y2Mate
  const Y2MATE_BASE_URL = 'https://www.y2mate.com/mates/en60/';

  /**
   * Fungsi helper untuk melakukan POST request dengan format x-www-form-urlencoded
   * @param {string} url - URL tujuan POST.
   * @param {object} formdata - Data yang akan dikirim.
   * @returns {Promise<object>} Response data dari Axios.
   */
  async function postData(url, formdata) {
    // Axios secara otomatis menangani serialisasi formdata
    return axios.post(url, formdata, {
      headers: {
        'Accept': '*/*',
        'Accept-Language': "en-US,en;q=0.9",
        'Content-Type': "application/x-www-form-urlencoded; charset=UTF-8",
        // Penting: Mengatur X-Requested-With meniru Ajax
        'X-Requested-With': 'XMLHttpRequest', 
      }
    });
  }

  /**
   * Proses scraping Y2Mate untuk mendapatkan link download 720p.
   * @param {string} url - URL video YouTube.
   * @returns {Promise<object>} Data download (link, thumbnail, judul, ukuran).
   */
  async function ythd(url) {
    if (!ytIdRegex.test(url)) {
      throw new Error('URL INVALID');
    }

    const ytId = ytIdRegex.exec(url);
    const vId = ytId[1];
    
    // Y2Mate menganalisis URL yang dinormalisasi ke format youtu.be
    const analyzeUrl = 'https://youtu.be/' + vId; 

    // --- LANGKAH 1: ANALISIS VIDEO ---
    const analyzeResponse = await postData(Y2MATE_BASE_URL + 'analyze/ajax', {
      url: analyzeUrl,
      q_auto: 0,
      ajax: 1
    });

    const analyzeResult = analyzeResponse.data;
    
    if (!analyzeResult || !analyzeResult.result) {
        throw new Error('Gagal mendapatkan hasil analisis dari Y2Mate.');
    }
    
    // Load hasil HTML dari `result` field ke Cheerio
    const $ = cheerio.load(analyzeResult.result); 

    const thumb = $('img').attr('src');
    const title = $('b').text().trim();
    
    // Cari ID Konversi (_id) yang digunakan untuk langkah berikutnya
    const idMatch = analyzeResult.result.match(/var k__id = "(.*?)"/)
    const conversionId = idMatch ? idMatch[1] : null;

    if (!conversionId) {
        throw new Error('ID Konversi (k__id) tidak ditemukan. Video mungkin diblokir atau format tidak tersedia.');
    }
    
    // Cari elemen 720p (fquality = 720, ftype = mp4)
    // Tipe ini biasanya berada dalam baris data MP4 
    let fkey = null;
    let filesizeF = null; // Ukuran file dalam format string (misal: 12.3 MB)
    
    $('table#table-mp4 tbody tr').each((i, el) => {
        const qualityText = $(el).find('td:nth-child(1)').text();
        // Mencari kualitas 720p
        if (qualityText && (qualityText.includes('720p') || qualityText.includes('720'))) {
            filesizeF = $(el).find('td:nth-child(2)').text().trim();
            // Ambil fkey dari tombol 'Download' yang terkait
            fkey = $(el).find('td:nth-child(3) a').attr('data-fkey');
            return false; // Hentikan iterasi setelah ditemukan
        }
    });
    
    if (!fkey) {
        throw new Error('Format video 720p tidak ditemukan. Mungkin hanya tersedia 360p/lainnya.');
    }

    // --- LANGKAH 2: KONVERSI VIDEO ---
    const convertResponse = await postData(Y2MATE_BASE_URL + 'convert', {
      type: 'youtube',
      _id: conversionId,
      v_id: vId,
      ajax: '1',
      token: '', // Token Y2Mate biasanya kosong
      ftype: 'mp4',
      fquality: 720, // Kualitas yang diminta
      k: fkey // fkey yang ditemukan dari langkah 1
    });

    const convertResult = convertResponse.data;
    
    if (!convertResult || !convertResult.result) {
         throw new Error('Gagal mendapatkan hasil konversi dari Y2Mate.');
    }

    // Ekstrak link download dari HTML hasil konversi
    const $convert = cheerio.load(convertResult.result);
    const dlLink = $convert('a.btn.btn-success[href^="http"]').attr('href'); 

    if (!dlLink) {
        throw new Error('Link download akhir tidak ditemukan setelah konversi.');
    }
    
    // Konversi ukuran file string (e.g., "12.3 MB") ke bytes atau KB
    let filesizeKB = 0;
    if (filesizeF) {
        const parts = filesizeF.split(' ');
        const num = parseFloat(parts[0]);
        const unit = parts[1].toUpperCase();
        if (unit === 'MB') {
            filesizeKB = num * 1024;
        } else if (unit === 'KB') {
            filesizeKB = num;
        }
    }

    return {
      dl_link: dlLink,
      thumb: thumb,
      title: title,
      filesizeF: filesizeF,
      filesizeKB: filesizeKB
    };
  }

  // --- ENDPOINT EXPRESS.JS ---
  app.get(`${prefix}/download/youtube`, async (req, res) => {
    const { url } = req.query; 

    if (!url) {
        return res.status(400).json({
            status: false,
            code: 400,
            message: "Parameter ?url= wajib diisi dengan link video YouTube."
        });
    }

    try {
      console.log(`[Y2Mate Downloader] Memproses URL: ${url}`);
      const result = await ythd(url);
      
      res.json({
          status: true,
          code: 200,
          message: `Video YouTube "${result.title}" berhasil diproses (720p).`,
          result: result
      });

    } catch (err) {
      let errorMessage = err.message;
      
      console.error("[Y2Mate Downloader] ERROR:", errorMessage);
      res.status(500).json({
          status: false,
          error: errorMessage,
          message: `Gagal memproses permintaan Y2Mate: ${errorMessage}`
      });
    }
  });
};
