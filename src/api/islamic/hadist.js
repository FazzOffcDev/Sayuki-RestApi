const axios = require('axios');

/**
 * Endpoint Hadith: Mengambil daftar hadith dengan fitur paginasi dan pencarian.
 */
module.exports = function (app, prefix = '') {

    // URL dasar API eksternal Hadith
    const BASE_EXTERNAL_URL = 'https://hadith-api-go.vercel.app/api/v1/hadis';

    /**
     * GET /hadis
     * Contoh: /hadis?page=2&limit=5&q=sholat
     */
    app.get(`${prefix}/hadis`, async (req, res) => {
        // Ambil query parameters, berikan nilai default
        const page = req.query.page || 1;
        const limit = req.query.limit || 10;
        const q = req.query.q; // Query pencarian (opsional)

        // Konstruksi URL eksternal dengan parameter
        let externalUrl = `${BASE_EXTERNAL_URL}?page=${page}&limit=${limit}`;
        if (q) {
            externalUrl += `&q=${encodeURIComponent(q)}`;
        }

        try {
            console.log(`[HADITH LIST] Mengambil data dari: ${externalUrl}`);

            // 1. Melakukan request ke server eksternal
            const response = await axios.get(externalUrl);

            const externalData = response.data;
            
            // Cek status keberhasilan dari API eksternal
            if (externalData.status !== 'success' && externalData.status !== true) {
                 return res.status(externalData.code || 500).json({
                    status: false,
                    code: externalData.code || 500,
                    message: externalData.message || "Gagal mengambil data dari sumber eksternal Hadith."
                });
            }
            
            // 2. Memproses dan menyusun hasil
            const cleanedData = externalData.data.map(hadith => ({
                number: hadith.number,
                arabic_text: hadith.arab,
                translation_id: hadith.id // Terjemahan Bahasa Indonesia
            }));

            // 3. Membuat struktur respons akhir
            const finalResponse = {
                status: true,
                code: 200,
                source: "Hadith API Go",
                message: externalData.message || "Berhasil mengambil data hadith.",
                query: q || null,
                pagination: {
                    current_page: externalData.pagination.current_page,
                    total_items: externalData.pagination.total_items,
                    total_pages: externalData.pagination.total_pages,
                    items_per_page: externalData.pagination.per_page,
                },
                result: cleanedData
            };

            // 4. Mengembalikan response data
            res.json(finalResponse);

        } catch (error) {
            console.error("[HADITH API ERROR]:", error.message);

            const status = error.response ? error.response.status : 500;
            let errorMessage = "Kesalahan tak terduga saat mengambil data hadith.";

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