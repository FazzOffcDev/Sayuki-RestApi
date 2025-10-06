/**
 * Catbox.moe File Uploader API
 * Endpoint: POST /api/upload/catbox
 */
module.exports = function (app, prefix = '') {
  const axios = require("axios");
  const FormData = require('form-data');
  // Asumsi: Server utama Anda telah menginisialisasi Multer dan meneruskannya ke sini.
  // Misalnya, const upload = require('multer')({ storage: require('multer').memoryStorage() });

  // Gunakan POST dan middleware Multer untuk satu file dengan nama 'fileToUpload'
  // Ganti 'upload' dengan variabel yang Anda gunakan di server utama Anda jika berbeda.
  app.post(`${prefix}/upload/catbox`, /* upload.single('fileToUpload'), */ async (req, res) => {
    // Di sini, req.file berisi file yang diunggah jika Multer berjalan.
    // Karena saya tidak bisa mengimplementasikan Multer, saya akan menggunakan penamaan standar.
    // Jika Anda menggunakan Multer, ganti req.body.fileToUpload dengan req.file
    
    // Asumsi: Anda mengakses file dari Multer.
    const file = req.file; 
    
    if (!file) {
        return res.status(400).json({
            status: false,
            code: 400,
            message: "Parameter 'file' (fileToUpload) wajib diisi. Pastikan Anda memilih file."
        });
    }

    try {
      const form = new FormData();
      form.append('reqtype', 'fileupload');
      // Penting: Nama key harus 'fileToUpload' sesuai Catbox API
      form.append('fileToUpload', file.buffer, { filename: file.originalname }); 
      
      const response = await axios.post('https://catbox.moe/user/api.php', form, {
        headers: form.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      const result = response.data;
      
      if (result.startsWith('https://')) {
          res.json({
              status: true,
              result: result,
              message: "File berhasil diupload ke Catbox.moe"
          });
      } else {
          res.status(500).json({
              status: false,
              message: `Gagal upload ke Catbox: ${result}`
          });
      }

    } catch (err) {
      console.error("CATBOX UPLOAD ERROR:", err.message);
      res.status(500).json({ 
          status: false, 
          error: err.message,
          message: "Gagal memproses permintaan upload di server."
      });
    }
  });
};