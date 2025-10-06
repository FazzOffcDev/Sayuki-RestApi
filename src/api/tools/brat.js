const axios = require('axios');

/**
 * Endpoint Canvas: Brat Image Generator
 */
module.exports = function (app, prefix = '') {
  app.get(`${prefix}/tools/brat`, async (req, res) => {
    const { text } = req.query;

    // Validasi parameter 'text'
    if (!text) {
      return res.status(400).json({ 
        status: false, 
        code: 400, 
        message: "Parameter 'text' wajib diisi." 
      });
    }

    try {
      // URL API eksternal
      const externalUrl = `https://api.nekolabs.my.id/canvas/brat/v1?text=${encodeURIComponent(text)}`;
      
      // Melakukan request ke server eksternal dan mengambil response sebagai stream
      const response = await axios.get(externalUrl, {
        responseType: 'stream' 
      });

      // Menetapkan header Content-Type dari response eksternal (penting agar browser tahu ini adalah gambar)
      res.set('Content-Type', response.headers['content-type']);
      res.status(response.status);
      
      // Mengalirkan (pipe) stream gambar langsung ke respons klien
      response.data.pipe(res);

    } catch (error) {
      console.error("BRAT CANVAS API ERROR:", error.message);
      const status = error.response ? error.response.status : 500;
      
      // Menangani error dari server eksternal
      res.status(status).json({ 
        status: false, 
        code: status, 
        message: "Kesalahan saat mengambil gambar dari server eksternal." 
      });
    }
  });
};