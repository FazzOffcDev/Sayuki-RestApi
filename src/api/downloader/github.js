const axios = require("axios");

/**
 * GitHub Repository Downloader
 * Endpoint: GET /endpoint/downloader/github-repo
 */
module.exports = function (app, prefix = '') {
  app.get(`${prefix}/download/github-repo`, async (req, res) => {
    const { url } = req.query;
    
    // 1. Validasi parameter wajib 'url'
    if (!url) {
        return res.status(400).json({ 
            status: false, 
            code: 400,
            message: "Parameter ?url= wajib diisi dengan URL GitHub Repository (e.g., https://github.com/user/repo)." 
        });
    }
    
    // Tambahkan validasi dasar format URL GitHub
    if (!url.includes('github.com')) {
         return res.status(400).json({ 
            status: false, 
            code: 400,
            message: "URL tidak valid. URL harus mengandung 'github.com'." 
        });
    }

    try {
      // 2. Ekstrak nama pengguna (user) dan nama repo dari URL
      // Menghilangkan protokol dan fragmen path lain, hanya menyisakan user/repo
      const path = new URL(url).pathname.split('/').filter(p => p.length > 0);
      
      if (path.length < 2) {
           return res.status(400).json({ 
                status: false, 
                code: 400,
                message: "Format URL GitHub tidak valid. Gunakan format: https://github.com/user/repo" 
            });
      }

      const user = path[0];
      const repo = path[1];
      
      // 3. Fungsi untuk mencoba mengunduh file ZIP dari branch tertentu
      const attemptDownload = async (branchName) => {
          const downloadUrl = `https://github.com/${user}/${repo}/archive/refs/heads/${branchName}.zip`;
          
          return axios.get(downloadUrl, {
              responseType: 'stream', 
              // Hanya sukses jika status 200, status lain akan memicu catch
              validateStatus: (status) => status === 200 
          });
      };
      
      let downloadResponse;
      let usedBranch = '';

      // 4. Prioritas Unduhan: Coba 'main', lalu 'master'
      try {
          downloadResponse = await attemptDownload('main');
          usedBranch = 'main';
      } catch (mainError) {
          // Jika 'main' gagal, coba 'master'
          try {
              downloadResponse = await attemptDownload('master');
              usedBranch = 'master';
          } catch (masterError) {
              // Jika kedua-duanya gagal, lemparkan error 404
              if (mainError.response && mainError.response.status === 404 &&
                  masterError.response && masterError.response.status === 404) {
                   throw new Error("Repositori atau branch 'main'/'master' tidak ditemukan (Error 404).");
              }
              // Lemparkan error lainnya
              throw mainError; 
          }
      }
      
      // 5. Atur Header dan Kirim streaming file ZIP
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${repo}-${usedBranch}.zip"`);
      
      // Mengirimkan stream data ke respons klien
      downloadResponse.data.pipe(res);

    } catch (err) {
      console.error("GITHUB DOWNLOAD ERROR:", err.message);
      
      let message = "Gagal mengunduh repositori. Pastikan URL dan repositori tersebut bersifat publik.";
      
      if (err.message.includes("404")) {
          message = "Repositori atau branch yang diminta ('main' atau 'master') tidak ditemukan. Pastikan URL benar.";
      }
      
      res.status(500).json({ 
          status: false, 
          code: 500,
          message: message
      });
    }
  });
};
