const axios = require('axios');

/**
 * Endpoint Discovery: Pencarian Wikipedia
 * Menggunakan Wikipedia API action=query&list=search.
 */
module.exports = function (app, prefix = '') {
  
  const WIKIPEDIA_API_URL = 'https://en.wikipedia.org/w/api.php';

  app.get(`${prefix}/search/wikipedia`, async (req, res) => {
    const { q } = req.query;

    // 1. Validasi parameter 'q' (query pencarian)
    if (!q) {
      return res.status(400).json({
        status: false,
        code: 400,
        message: "Parameter 'q' (query pencarian Wikipedia) wajib diisi."
      });
    }

    try {
      // 2. Konfigurasi parameter API
      const params = {
        action: 'query',
        list: 'search',
        srsearch: q, // Menggunakan query dari parameter 'q'
        utf8: '', 
        format: 'json'
      };

      // 3. Melakukan request ke Wikipedia API
      const response = await axios.get(WIKIPEDIA_API_URL, { params });
      const data = response.data;
      
      // Cek jika API mengembalikan error
      if (data.error) {
          throw new Error(`Wikipedia API Error: ${data.error.info}`);
      }
      
      // 4. Memproses dan membersihkan hasil
      const searchResults = data.query.search.map(item => ({
          title: item.title,
          page_id: item.pageid,
          size_bytes: item.size,
          word_count: item.wordcount,
          snippet: item.snippet, // Snippet masih mengandung tag HTML (searchmatch)
          timestamp: item.timestamp,
          url: `https://en.wikipedia.org/?curid=${item.pageid}` // URL ke halaman Wikipedia
      }));
      
      // 5. Membuat struktur respons akhir
      const finalResponse = {
          status: true,
          code: 200,
          query: q,
          total_results: data.query.searchinfo.totalhits,
          // Menyertakan token continue untuk paging (halaman selanjutnya)
          continue: data.continue || null, 
          results: searchResults
      };

      // Mengembalikan response data
      res.json(finalResponse);

    } catch (error) {
      console.error("WIKIPEDIA API ERROR:", error.message);
      
      const status = error.response ? error.response.status : 500;
      let errorMessage = error.message;

      // Coba ambil pesan error dari response data jika ada (biasanya tidak ada untuk Wikipedia)
      if (error.response && error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
      }
      
      // Mengembalikan response error
      res.status(status).json({
        status: false,
        code: status,
        message: `Gagal melakukan pencarian Wikipedia: ${errorMessage}`
      });
    }
  });
};