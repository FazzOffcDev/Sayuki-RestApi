const axios = require('axios');

/**
 * Daftar kategori yang didukung oleh Okezone News API.
 * Digunakan untuk validasi.
 */
const SUPPORTED_TYPES = [
    "breaking",
    "sport",
    "economy",
    "lifestyle",
    "celebrity",
    "bola",
    "techno",
];

/**
 * Endpoint Berita Okezone berdasarkan Tipe/Kategori: 
 * Mengambil daftar berita dari kategori tertentu dari API eksternal.
 */
module.exports = function (app, prefix = '') {

    // URL dasar API eksternal Okezone News
    const BASE_EXTERNAL_URL = 'https://berita-indo-api-next.vercel.app/api/okezone-news/';

    /**
     * GET /news/okezone/:type
     * Contoh: /news/okezone/techno
     */
    app.get(`${prefix}/news/okezone`, async (req, res) => {
        const type = req.params.type.toLowerCase();

        // 1. Validasi Kategori
        if (!SUPPORTED_TYPES.includes(type)) {
            return res.status(400).json({
                status: false,
                code: 400,
                message: `Kategori '${type}' tidak didukung untuk Okezone News. Kategori yang tersedia: ${SUPPORTED_TYPES.join(', ')}.`
            });
        }

        const EXTERNAL_URL = `${BASE_EXTERNAL_URL}${type}`;

        try {
            console.log(`[OKEZONE NEWS - ${type.toUpperCase()}] Mengambil data dari: ${EXTERNAL_URL}`);

            // 2. Melakukan request ke server eksternal
            const response = await axios.get(EXTERNAL_URL);

            const data = response.data; // Data adalah objek lengkap dari API berita

            // 3. Memproses dan menyusun hasil
            const cleanedData = data.data.map(news => ({
                title: news.title,
                link: news.link,
                snippet: news.contentSnippet,
                published_at: news.isoDate,
                images: {
                    small: news.image.small,
                    large: news.image.large
                }
            }));

            // 4. Membuat struktur respons akhir
            const finalResponse = {
                status: true,
                code: 200,
                source: "Okezone",
                type: type,
                message: data.message || `Berhasil mengambil data berita kategori ${type}.`,
                total_results: cleanedData.length,
                result: cleanedData
            };

            // 5. Mengembalikan response data
            res.json(finalResponse);

        } catch (error) {
            console.error(`[OKEZONE NEWS - ${type.toUpperCase()} API ERROR]:`, error.message);

            const status = error.response ? error.response.status : 500;
            let errorMessage = `Kesalahan tak terduga saat mengambil berita kategori ${type} dari Okezone.`;

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