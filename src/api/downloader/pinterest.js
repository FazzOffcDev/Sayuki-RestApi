/**
 * Pinterest Downloader dan Scraper
 * Menggunakan API pihak ketiga (savepinmedia.com) untuk mendapatkan link download 
 * dan metadata dari pin Pinterest.
 */
module.exports = function (app, prefix = '') {
  const axios = require('axios');
  const cheerio = require('cheerio');
  
  // URL dasar API pihak ketiga
  const BASE_API_URL = 'https://savepinmedia.com/php/api/api.php';
  const BASE_URL = 'https://savepinmedia.com';
  
  // Endpoint Express.js
  app.get(`${prefix}/download/pinterest`, async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({
            status: false,
            code: 400,
            message: "Parameter ?url= wajib diisi dengan link Pin Pinterest."
        });
    }

    try {
      console.log(`[Pinterest] Memproses Pin: ${url}`);
      
      const apiUrl = `${BASE_API_URL}?url=${encodeURIComponent(url)}`;
      
      // Langkah 1: Panggil API pihak ketiga
      const response = await axios.get(apiUrl, {
        headers: {
          'Accept': '*/*',
          // Header X-Requested-With sangat penting agar API menganggap permintaan berasal dari AJAX
          'X-Requested-With': 'XMLHttpRequest', 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          'Referer': BASE_URL,
        }
      });

      // Respons dari API adalah potongan HTML yang perlu di-scrape
      const $ = cheerio.load(response.data);
      
      // Langkah 2: Ekstraksi Data dari HTML (meniru logika Python Anda)
      
      // 1. Gambar Utama / Preview
      // Ambil URL gambar dari CSS background-image
      const mainImageStyle = $('.load-screenshot').css('background-image');
      let imageUrl = null;
      if (mainImageStyle) {
          // Bersihkan string 'url(' dan tanda kutip dari nilai CSS
          imageUrl = mainImageStyle.replace(/url\(|\)|"|'/g, '');
      }

      // 2. Data Penulis (Author)
      const authorElement = $('.author .info span a');
      const authorPhoto = $('.author .photo img').attr('src');
      
      const authorName = authorElement.text();
      const authorLink = authorElement.attr('href');
      
      // 3. Link Download
      const downloadLinkPath = $('.button-download a').attr('href');
      let downloadFile = null;
      
      // Pastikan path downloadLinkPath ada dan tambahkan BASE_URL (https://savepinmedia.com)
      if (downloadLinkPath) {
          downloadFile = `${BASE_URL}${downloadLinkPath}`;
      }

      const result = {
          title: $('.download-pin h4').text().trim() || 'Pinterest Pin',
          imageUrl: imageUrl,
          author: {
              name: authorName,
              link: authorLink,
              photo: authorPhoto
          },
          downloadFile: downloadFile, // Link download langsung (video/gambar)
          sourceUrl: url
      };

      if (!downloadFile) {
        throw new Error("Gagal menemukan link download dalam respons API. Mungkin Pin tidak valid.");
      }
      
      res.json({
          status: true,
          code: 200,
          message: "Data Pin Pinterest berhasil diambil.",
          result: result
      });

    } catch (err) {
      console.error("[Pinterest] ERROR:", err.message);
      res.status(500).json({
          status: false,
          error: err.message,
          message: "Gagal memproses permintaan Pinterest di server. Coba pastikan Pin valid."
      });
    }
  });
};
