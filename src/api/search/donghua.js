/**
 * Scraper untuk Donghub (https://donghub.vip/)
 * Menyediakan endpoint untuk mengambil daftar semua film (Movie Type) dan melakukan pencarian.
 */
module.exports = function (app, prefix = '') {
  const axios = require('axios');
  const cheerio = require('cheerio');
  
  const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

  /**
   * Mengambil semua daftar film (Movie Type) dari Donghub dengan iterasi halaman.
   * Ini bisa memakan waktu lama dan menggunakan banyak sumber daya.
   * @returns {Promise<Array<object>>} Daftar film.
   */
  async function scrapeDonghubAllMovies() {
    const baseUrl = 'https://donghub.vip/anime/page/';
    const allMovies = [];
    let page = 1;

    try {
      while (true) {
        // Filter: Type=Movie, Order=update
        const url = `${baseUrl}${page}/?status=&type=Movie&order=update`;
        
        // Batasi iterasi untuk menghindari scraping yang terlalu lama di lingkungan server
        if (page > 5) { 
            console.log('Batasan 5 halaman tercapai untuk scraping semua film.');
            break; 
        }

        const response = await axios.get(url, { headers: { 'User-Agent': USER_AGENT } });
        const $ = cheerio.load(response.data);
        const movies = [];

        // Cek apakah ada hasil di halaman ini
        $('.listupd .bs').each((index, element) => {
          const title = $(element).find('.tt h2').text().trim();
          const movieUrl = $(element).find('.bsx > a').attr('href');
          const imageUrl = $(element).find('.limit img').attr('src');
          const status = $(element).find('.limit .status').text().trim() || null;
          const episodeInfo = $(element).find('.limit .bt .epx').text().trim() || null;

          if (title && movieUrl) {
            movies.push({
              title,
              url: movieUrl,
              image: imageUrl,
              status,
              episode_info: episodeInfo,
            });
          }
        });

        if (movies.length === 0) {
          console.log(`[Donghub Movie] Tidak ada data di halaman ${page}. Menghentikan loop.`);
          break;
        }

        allMovies.push(...movies);
        page++;
      }

      console.log(`[Donghub Movie] Berhasil mengambil total ${allMovies.length} film.`);
      return allMovies;
    } catch (error) {
      console.error('[Donghub Movie] Terjadi kesalahan saat scraping:', error.message);
      throw new Error("Gagal mengambil daftar film. Sumber mungkin tidak dapat diakses.");
    }
  }

  /**
   * Mencari anime/film di Donghub berdasarkan kata kunci.
   * @param {string} query - Kata kunci pencarian.
   * @returns {Promise<Array<object>>} Hasil pencarian.
   */
  async function searchDonghub(query) {
    const formattedQuery = query.replace(/ /g, '+');
    const searchUrl = `https://donghub.vip/?s=${formattedQuery}`;

    try {
      const response = await axios.get(searchUrl, { headers: { 'User-Agent': USER_AGENT } });
      const $ = cheerio.load(response.data);
      const searchResults = [];

      $('.listupd .bs').each((index, element) => {
        const title = $(element).find('.tt h2').text().trim();
        const url = $(element).find('.bsx > a').attr('href');
        const image = $(element).find('.limit img').attr('src');
        const type = $(element).find('.limit .typez').text().trim() || 'N/A';
        const episodeInfo = $(element).find('.limit .bt .epx').text().trim() || null;

        if (title && url) {
          searchResults.push({
            title,
            url,
            image,
            type,
            episode_info: episodeInfo,
          });
        }
      });

      console.log(`[Donghub Search] Ditemukan ${searchResults.length} hasil untuk "${query}".`);
      return searchResults;

    } catch (error) {
      console.error('[Donghub Search] Terjadi kesalahan saat pencarian:', error.message);
      throw new Error("Gagal melakukan pencarian. Sumber mungkin tidak dapat diakses.");
    }
  }

  // --- ENDPOINT 1: GET ALL MOVIES ---
  app.get(`${prefix}/search/donghub/movies`, async (req, res) => {
    try {
      const allMovies = await scrapeDonghubAllMovies();
      res.json({
          status: true,
          code: 200,
          result: allMovies
      });
    } catch (err) {
      res.status(500).json({ 
          status: false, 
          error: err.message,
          message: "Gagal mengambil daftar film Donghub."
      });
    }
  });

  // --- ENDPOINT 2: SEARCH ANIME/FILM ---
  app.get(`${prefix}/search/donghub`, async (req, res) => {
    const { q } = req.query; // Menggunakan 'q' sebagai query parameter

    if (!q) {
        return res.status(400).json({ 
            status: false, 
            code: 400,
            message: "Parameter ?q= wajib diisi untuk kata kunci pencarian." 
        });
    }

    try {
      const searchResults = await searchDonghub(q);
      res.json({
          status: true,
          code: 200,
          query: q,
          total_results: searchResults.length,
          result: searchResults
      });
    } catch (err) {
      res.status(500).json({ 
          status: false, 
          error: err.message,
          message: "Gagal melakukan pencarian di Donghub."
      });
    }
  });
};
