const axios = require('axios');

/**
 * Endpoint Kisah Nabi Acak: 
 * Mengambil satu kisah nabi secara acak dari sumber eksternal.
 */
module.exports = function (app, prefix = '') {

    // URL API eksternal Kisah Nabi
    const EXTERNAL_URL = 'https://islami.api.akuari.my.id/kisahnabi';

    /**
     * GET /kisahnabi
     * Contoh: /kisahnabi
     */
    app.get(`${prefix}/kisahnabi`, async (req, res) => {
        try {
            console.log(`[KISAH NABI] Mengambil data dari: ${EXTERNAL_URL}`);

            // 1. Melakukan request ke server eksternal
            const response = await axios.get(EXTERNAL_URL);

            const data = response.data; 
            
            // Cek jika API eksternal tidak mengembalikan objek 'hasil' yang diharapkan
            if (!data.hasil) {
                 return res.status(500).json({
                    status: false,
                    code: 500,
                    message: "Gagal memproses data dari sumber eksternal Kisah Nabi."
                });
            }

            const result = data.hasil;

            // 2. Memproses dan menyusun hasil
            const cleanedData = {
                name: result.name,
                year_of_birth: result.thn_kelahiran,
                age: result.usia,
                place: result.tmp,
                description: result.description.trim(),
                image_url: result.image_url,
                icon_url: result.icon_url
            };

            // 3. Membuat struktur respons akhir
            const finalResponse = {
                status: true,
                code: 200,
                source: "islami.api.akuari.my.id",
                message: `Berhasil mengambil kisah ${result.name} secara acak.`,
                result: cleanedData
            };

            // 4. Mengembalikan response data
            res.json(finalResponse);

        } catch (error) {
            console.error("[KISAH NABI API ERROR]:", error.message);

            const status = error.response ? error.response.status : 500;
            let errorMessage = "Kesalahan tak terduga saat mengambil Kisah Nabi.";

            if (error.response && error.response.data && error.response.data.message) {
                errorMessage = error.response.data.message;
            }

            // Mengembalikan response error yang terstruktur
            res.status(status).json({
                status: false,
                code: status,
                message: errorMessage
            });
        }
    });
};