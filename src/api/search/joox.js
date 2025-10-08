/**
 * Joox Music Search and Downloader
 * Mencari lagu dan mendapatkan metadata serta link MP3 langsung dari Joox API.
 */
module.exports = function (app, prefix = '') {
  const axios = require('axios');

  // Cookie yang diperlukan untuk API get_songinfo (diambil dari kode asli Anda)
  const JOOX_HEADERS = {
    Cookie: 'wmid=142420656; user_type=1; country=id; session_key=2a5d97d05dc8fe238150184eaf3519ad;'
  };
  
  /**
   * Melakukan pencarian di Joox dan mengambil detail lagu.
   * @param {string} query - Kata kunci pencarian.
   * @returns {Promise<object>} Objek hasil pencarian.
   */
  async function jooxSearchAndDownload(query) {
    if (!query) {
      throw new Error("Query pencarian tidak boleh kosong.");
    }
    
    // Waktu timestamp untuk API Joox
    const time = Math.floor(Date.now() / 1000);
    
    // Langkah 1: Mencari lagu berdasarkan query
    const searchUrl = `http://api.joox.com/web-fcgi-bin//web_search?lang=id&country=id&type=0&search_input=${encodeURIComponent(query)}&pn=1&sin=0&ein=29&_=${time}`;
    
    const searchResponse = await axios.get(searchUrl);
    const itemlist = searchResponse.data?.itemlist;

    if (!itemlist || itemlist.length === 0) {
      throw new Error("Tidak ada hasil lagu yang ditemukan di Joox.");
    }
    
    // Ambil semua songid
    const songIds = itemlist.map(item => item.songid).filter(id => id);

    // Langkah 2: Membuat array promises untuk mendapatkan detail lagu secara paralel
    const detailPromises = songIds.map(songid => {
        const detailUrl = `http://api.joox.com/web-fcgi-bin/web_get_songinfo?songid=${songid}`;
        
        return axios.get(detailUrl, { headers: JOOX_HEADERS })
            .then(response => {
                // Joox mengembalikan respons yang dibungkus dengan fungsi call (MusicInfoCallback)
                const jsonString = response.data.replace('MusicInfoCallback(', '').replace('\n)', '');
                const res = JSON.parse(jsonString);
                
                // Cek apakah data valid dan memiliki link mp3
                if (res.mp3Url) {
                    return {
                        lagu: res.msong,
                        album: res.malbum,
                        penyanyi: res.msinger,
                        publish: res.public_time,
                        img: res.imgSrc,
                        mp3: res.mp3Url // Link MP3 langsung
                    };
                }
                return null; // Abaikan jika tidak ada link MP3
            })
            .catch(error => {
                console.warn(`[Joox] Gagal mengambil detail untuk songid ${songid}: ${error.message}`);
                return null;
            });
    });

    // Jalankan semua promises secara paralel
    const detailResults = await Promise.all(detailPromises);
    
    // Filter hasil yang valid (bukan null)
    const finalResults = detailResults.filter(r => r !== null);

    if (finalResults.length === 0) {
        throw new Error("Ditemukan hasil pencarian, tetapi gagal mendapatkan detail atau link download untuk semua lagu.");
    }

    return {
        creator: "Aine",
        status: true,
        data: finalResults,
    };
  }

  // --- ENDPOINT EXPRESS.JS ---
  app.get(`${prefix}/search/joox`, async (req, res) => {
    const { q } = req.query; 

    if (!q) {
        return res.status(400).json({
            status: false,
            code: 400,
            message: "Parameter ?q= wajib diisi dengan judul lagu atau artis."
        });
    }

    try {
      console.log(`[Joox Search] Mencari: ${q}`);
      const results = await jooxSearchAndDownload(q);
      
      res.json(results);

    } catch (err) {
      let errorMessage = err.message || "Kesalahan tak terduga dalam memproses Joox.";
      
      console.error("[Joox Search] ERROR:", errorMessage);
      res.status(500).json({
          status: false,
          error: errorMessage,
          message: `Gagal memproses permintaan Joox: ${errorMessage}`
      });
    }
  });
};
