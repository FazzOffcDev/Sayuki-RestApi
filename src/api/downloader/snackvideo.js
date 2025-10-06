// src/api/d/snackvideo.js

/**
 * Snack Video Downloader (via api.siputzx.my.id)
 * Endpoint: GET /endpoint/d/snackvideo
 */
module.exports = function (app, prefix = '/endpoint') {
  const axios = require("axios");

  app.get(`${prefix}/download/snackvideo`, async (req, res) => {
    const { url } = req.query;
    
    // Validasi parameter wajib 'url'
    if (!url) {
        return res.status(400).json({ 
            status: false, 
            code: 400,
            message: "Parameter ?url= wajib diisi dengan URL Snack Video." 
        });
    }

    try {
      const apiUrl = 'https://api.siputzx.my.id/api/d/snackvideo';
      
      const response = await axios.get(apiUrl, {
        params: { 
            url: url,
        },
        // Tambahkan header opsional jika API eksternal memerlukannya
        headers: {
            'Accept': 'application/json' 
        }
      });

      // Berikan respon langsung dari API eksternal
      res.json(response.data);
    } catch (err) {
      console.error("SNACK VIDEO API ERROR:", err.message);
      // Tangani error HTTP dari API eksternal
      const statusCode = err.response ? err.response.status : 500;
      const errorMessage = err.response ? err.response.data : err.message;

      res.status(statusCode).json({ 
          status: false, 
          error: errorMessage,
          message: "Gagal memproses permintaan Snack Video di server."
      });
    }
  });
};