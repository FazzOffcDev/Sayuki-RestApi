/**
 * NPM Package Stalker
 * Mengambil metadata, versi, dan informasi dependensi dari paket di NPM Registry.
 */
module.exports = function (app, prefix = '') {
  const axios = require('axios');
  
  // URL dasar NPM Registry
  const NPM_REGISTRY_URL = 'https://registry.npmjs.org/';
  
  /**
   * Mengambil dan memproses data paket dari NPM Registry.
   * @param {string} packageName Nama paket NPM.
   * @returns {Promise<object>} Objek berisi metadata paket yang sudah diproses.
   */
  async function npmstalk(packageName) {
    if (!packageName) {
        throw new Error("Nama paket tidak boleh kosong.");
    }
    
    // Panggilan ke NPM Registry
    const stalk = await axios.get(NPM_REGISTRY_URL + packageName);
    const data = stalk.data;
    
    const versions = data.versions;
    const allver = Object.keys(versions);
    
    // Versi Terbaru (Versi terakhir dalam array)
    const verLatest = allver[allver.length - 1];
    
    // Versi Awal (Versi pertama dalam array)
    const verPublish = allver[0];
    
    const packageLatest = versions[verLatest];
    const packagePublish = versions[verPublish];

    // Menghitung jumlah dependensi (jika ada, jika tidak, anggap 0)
    const latestDependenciesCount = packageLatest.dependencies ? Object.keys(packageLatest.dependencies).length : 0;
    const publishDependenciesCount = packagePublish.dependencies ? Object.keys(packagePublish.dependencies).length : 0;
    
    return {
      name: packageName,
      versionLatest: verLatest,
      versionPublish: verPublish,
      versionUpdate: allver.length, // Total jumlah versi yang pernah dirilis
      latestDependencies: latestDependenciesCount,
      publishDependencies: publishDependenciesCount,
      publishTime: data.time.created, // Waktu publikasi awal
      latestPublishTime: data.time[verLatest] // Waktu publikasi versi terbaru
    };
  }

  // --- ENDPOINT EXPRESS.JS ---
  app.get(`${prefix}/info/npm`, async (req, res) => {
    const { q } = req.query; // Menggunakan 'q' sebagai query untuk nama paket

    if (!q) {
        return res.status(400).json({
            status: false,
            code: 400,
            message: "Parameter ?q= wajib diisi dengan nama paket NPM (misalnya: axios, cheerio)."
        });
    }

    try {
      console.log(`[NPM Stalker] Mencari paket: ${q}`);
      const result = await npmstalk(q);
      
      res.json({
          status: true,
          code: 200,
          message: `Informasi paket NPM "${q}" berhasil diambil.`,
          result: result
      });

    } catch (err) {
      // Menangani status 404 dari NPM Registry (paket tidak ditemukan)
      let errorMessage = err.message;
      if (err.response && err.response.status === 404) {
          errorMessage = `Paket NPM "${q}" tidak ditemukan di registry.`;
      }
      
      console.error("[NPM Stalker] ERROR:", errorMessage);
      res.status(500).json({
          status: false,
          error: errorMessage,
          message: `Gagal memproses permintaan NPM: ${errorMessage}`
      });
    }
  });
};
