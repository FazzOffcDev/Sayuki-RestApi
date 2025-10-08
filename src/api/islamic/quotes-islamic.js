const axios = require('axios');

/**
 * Endpoint Renungan Islam Acak (Gambar): 
 * Mengambil satu gambar renungan Islam secara acak dari sumber eksternal 
 * dan mengembalikannya sebagai file gambar (image/png) langsung ke klien.
 */
module.exports = function (app, prefix = '') {

    // URL API eksternal Renungan Islam
    const EXTERNAL_URL = 'https://islami.api.akuari.my.id/renunganislam';

    /**
     * GET /renunganislam
     * Contoh: /renunganislam
     */
    app.get(`${prefix}/renunganislam`, async (req, res) => {
        try {
            console.log(`[RENUNGAN ISLAM] Mengambil data gambar dari: ${EXTERNAL_URL}`);

            // 1. Melakukan request ke server eksternal dengan responseType 'arraybuffer' 
            // untuk menangani data biner (gambar)
            const response = await axios.get(EXTERNAL_URL, { 
                responseType: 'arraybuffer',
                headers: {
                    'Accept': 'image/png' // Mengikuti header 'accept' yang disarankan
                }
            });

            // 2. Mengambil Content-Type dari respons eksternal 
            // (diasumsikan 'image/png' atau jenis gambar lain)
            const contentType = response.headers['content-type'] || 'image/png';

            // 3. Mengatur header respons untuk klien dan mengirim data gambar
            res.set('Content-Type', contentType);
            res.status(200).send(response.data);

        } catch (error) {
            console.error("[RENUNGAN ISLAM API ERROR]:", error.message);

            const status = error.response ? error.response.status : 500;
            let errorMessage = "Kesalahan tak terduga saat mengambil gambar renungan Islam. Sumber eksternal mungkin tidak tersedia atau mengembalikan format data yang tidak diharapkan.";
            
            // Karena endpoint ini seharusnya mengembalikan gambar, jika terjadi error,
            // kita harus mengembalikan JSON error yang terstruktur.
            res.status(status).json({
                status: false,
                code: status,
                message: errorMessage
            });
        }
    });
};