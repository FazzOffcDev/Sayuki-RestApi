/**
 * Image Upscaler Tool
 * Mengambil URL gambar, mengunduh, dan mengirimkannya ke API Lexica (qewertyy.dev) untuk di-upscale.
 * Hasil dikembalikan langsung sebagai respons biner (gambar).
 */
module.exports = function (app, prefix = '') {
    const axios = require("axios");

    // Fungsi helper untuk mengonversi Buffer ke Base64 (string)
    function bufferToBase64(buffer) {
        return buffer.toString('base64');
    }

    /**
     * Memanggil API Lexica Upscale.
     * @param {Buffer} imageBuffer - Buffer biner dari gambar.
     * @returns {Promise<Buffer>} Buffer dari gambar hasil upscale.
     */
    async function upscaleImage(imageBuffer) {
        // Mengubah buffer biner menjadi Base64 string untuk dikirim dalam payload JSON
        const base64Image = bufferToBase64(imageBuffer);
        
        const payload = {
            // API ini diharapkan menerima Base64 string dari gambar
            image_data: base64Image, 
            format: "binary", 
        };

        const response = await axios.post("https://lexica.qewertyy.dev/upscale", payload, {
            headers: {
                "Content-Type": "application/json",
            },
            // Mengharapkan respons dalam format biner (Buffer)
            responseType: 'arraybuffer', 
            timeout: 60000 // Batas waktu 60 detik untuk proses upscale
        });

        // Mengembalikan data biner yang diterima sebagai Buffer
        return Buffer.from(response.data);
    }
    
    // --- ENDPOINT EXPRESS.JS ---
    app.get(`${prefix}/tools/upscalev2`, async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                status: false,
                code: 400,
                message: "Parameter ?url= wajib diisi dengan link gambar yang akan di-upscale."
            });
        }
        
        try {
            // 1. Ambil konten gambar dari URL
            const imageResponse = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 15000 // 15 detik untuk fetching gambar sumber
            });
            
            const imageBuffer = Buffer.from(imageResponse.data);
            const imageMimeType = imageResponse.headers['content-type'] || 'image/jpeg';
            
            // 2. Panggil API Upscale
            console.log(`[Upscaler] Mengirim gambar untuk upscale. Ukuran: ${imageBuffer.length} bytes`);
            
            const upscaledBuffer = await upscaleImage(imageBuffer);

            if (!upscaledBuffer || upscaledBuffer.length < 50) { // Check for minimal size
                 throw new Error("API Upscale mengembalikan respons gambar yang tidak valid.");
            }
            
            // 3. Kirim gambar hasil upscale sebagai respons biner
            // Biasanya API upscale mengembalikan PNG, tapi kita set header berdasarkan mime awal atau default ke image/png
            res.setHeader('Content-Type', 'image/png'); 
            res.setHeader('Content-Disposition', 'inline; filename="upscaled_image.png"');
            res.send(upscaledBuffer);

        } catch (err) {
            let errorMessage = "Gagal memproses gambar. Pastikan URL gambar valid, atau API Lexica sedang bermasalah.";
            let statusCode = 500;
            
            if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
                 errorMessage = "Waktu tunggu habis (timeout). Proses upscale terlalu lama. Coba lagi dengan gambar yang lebih kecil.";
                 statusCode = 504;
            } else if (err.response) {
                 errorMessage = `Gagal dari API eksternal. Status: ${err.response.status}. Pesan: ${err.response.statusText}.`;
                 statusCode = err.response.status;
            }
            
            console.error("[Upscaler] ERROR:", err.message);
            
            // Jika terjadi error, kirim JSON response
            if (!res.headersSent) {
                res.status(statusCode).json({
                    status: false,
                    error: errorMessage,
                    message: `Gagal memproses permintaan Upscale: ${errorMessage}`
                });
            }
        }
    });
};
