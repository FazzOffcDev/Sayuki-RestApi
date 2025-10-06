const fs = require('fs');
const path = require('path');

/**
 * Endpoint Utility: Random Image from Internal JSON
 */
module.exports = function (app, prefix = '') {
  // Tentukan path file JSON relatif terhadap file handler ini
  const imageListPath = path.join(__dirname, '..', '..', '..', 'data', 'inori.json');
  
  // Memuat data sekali saat server dimulai (caching)
  let imageList = [];
  try {
    const data = fs.readFileSync(imageListPath, 'utf-8');
    imageList = JSON.parse(data);
    console.log(`[Random Image] Loaded ${imageList.length} URLs.`);
  } catch (e) {
    console.error(`[Random Image] GAGAL memuat file JSON: ${e.message}`);
  }

  app.get(`${prefix}/image/inori`, (req, res) => {
    if (imageList.length === 0) {
      return res.status(500).json({
        status: false,
        code: 500,
        message: "Daftar gambar acak tidak ditemukan atau kosong di server (random_images.json)."
      });
    }

    // Logika pemilihan URL acak
    const randomIndex = Math.floor(Math.random() * imageList.length);
    const randomUrl = imageList[randomIndex];

    // Mengembalikan response dalam format JSON
    res.json({
      status: true,
      data: {
        url: randomUrl,
        source: 'internal_random_json'
      },
      timestamp: new Date().toISOString()
    });
  });
};