const axios = require("axios");
const FormData = require("form-data");

/**
 * Fungsi inti untuk mengunggah dan memproses gambar
 * Menggunakan Buffer/Memory, tidak menyimpan file di disk.
 */
async function processUpscale(imageBuffer, filename, scale = 2) {
  try {
    const form = new FormData();
    // Menggunakan Buffer sebagai stream, menambahkan filename dan content type
    form.append("file", imageBuffer, {
      filename: filename,
      contentType: 'image/jpeg' // Asumsi, bisa disesuaikan jika perlu
    });

    // 1. UPLOAD IMAGE
    const uploadRes = await axios.post("https://get1.imglarger.com/api/UpscalerNew/UploadNew", form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    
    if (uploadRes.data.code !== 10000) {
        throw new Error(`Upload failed: ${uploadRes.data.msg}`);
    }
    const code = uploadRes.data.data.code;

    // 2. CHECK STATUS AND GET DOWNLOAD LINK
    let maxChecks = 10;
    while (maxChecks > 0) {
      const body = { code, scaleRadio: scale };
      const res = await axios.post("https://get1.imglarger.com/api/UpscalerNew/CheckStatusNew", body, {
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          Referer: "https://imgupscaler.com/"
        }
      });
      const data = res.data.data;
      
      if (data.status === "success" && data.downloadUrls && data.downloadUrls.length > 0) {
        return { status: true, url: data.downloadUrls[0], filename: data.originalfilename };
      }
      
      if (data.status === "failed") {
         throw new Error("Processing failed on external API.");
      }

      maxChecks--;
      await new Promise(r => setTimeout(r, 3000)); // Tunggu 3 detik
    }
    
    throw new Error("Processing timed out or status check limit reached.");
    
  } catch (e) {
    return { status: false, message: e.message };
  }
}

/**
 * Endpoint Canvas: Image Upscaler (2x)
 */
module.exports = function (app, prefix = '') {
  app.get(`${prefix}/tools/upscale`, async (req, res) => {
    const { imageUrl, scale = 2 } = req.query;

    if (!imageUrl) {
      return res.status(400).json({
        status: false,
        code: 400,
        message: "Parameter 'imageUrl' (link gambar) wajib diisi."
      });
    }

    try {
      // 1. Unduh gambar ke memory (Buffer)
      const downloadRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const imageBuffer = downloadRes.data;
      
      // Ambil nama file dari URL atau berikan nama default
      const filename = imageUrl.substring(imageUrl.lastIndexOf('/') + 1) || 'image.jpg';
      
      // 2. Kirim Buffer ke fungsi pemrosesan
      const result = await processUpscale(imageBuffer, filename, parseInt(scale));

      if (result.status) {
        res.json({
          status: true,
          data: {
            upscaled_url: result.url,
            original_filename: result.filename,
            scale: parseInt(scale)
          }
        });
      } else {
        res.status(502).json({
          status: false,
          code: 502,
          message: `Gagal memproses gambar di layanan eksternal: ${result.message}`
        });
      }

    } catch (error) {
      console.error("UPSCALER API ERROR:", error.message);
      res.status(500).json({
        status: false,
        code: 500,
        message: `Terjadi kesalahan saat mengunduh atau memproses gambar: ${error.message}`
      });
    }
  });
};