const axios = require('axios');

/**
 * Endpoint Asmaul Husna Acak: 
 * Mengambil satu Asmaul Husna secara acak dari sumber eksternal.
 */
module.exports = function (app, prefix = '') {

    // URL API eksternal Asmaul Husna
    const EXTERNAL_URL = 'https://islami.api.akuari.my.id/asmaulhusna';

    /**
     * GET /asmaulhusna
     * Contoh: /asmaulhusna
     */
    app.get(`${prefix}/asmaulhusna`, async (req, res) => {
        try {
            console.log(`[ASMAUL HUSNA] Mengambil data dari: ${EXTERNAL_URL}`);

            // 1. Melakukan request ke server eksternal
            const response = await axios.get(EXTERNAL_URL);

            const data = response.data; 
            
            // Cek jika API eksternal tidak mengembalikan objek 'result' yang diharapkan
            if (!data.result) {
                 return res.status(500).json({
                    status: false,
                    code: 500,
                    message: "Gagal memproses data dari sumber eksternal Asmaul Husna."
                });
            }

            const result = data.result;

            // 2. Memproses dan menyusun hasil
            const cleanedData = {
                number: result.number,
                latin: result.latin,
                arabic: result.arab,
                translation_id: result.translate_id,
                translation_en: result.translate_en
            };

            // 3. Membuat struktur respons akhir
            const finalResponse = {
                status: true,
                code: 200,
                source: "islami.api.akuari.my.id",
                message: "Berhasil mengambil Asmaul Husna secara acak.",
                result: cleanedData
            };

            // 4. Mengembalikan response data
            res.json(finalResponse);

        } catch (error) {
            console.error("[ASMAUL HUSNA API ERROR]:", error.message);

            const status = error.response ? error.response.status : 500;
            let errorMessage = "Kesalahan tak terduga saat mengambil Asmaul Husna.";

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