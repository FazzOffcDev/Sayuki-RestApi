const axios = require('axios');

/**
 * Daftar kategori yang didukung oleh CNN News API.
 * Digunakan untuk validasi.
 */
const SUPPORTED_TYPES = [
    "nasional",
    "internasional",
    "ekonomi",
    "olahraga",
    "teknologi",
    "hiburan",
    "gaya-hidup",
];

/**
 * Endpoint Berita CNN Indonesia berdasarkan Tipe/Kategori: 
 * Mengambil daftar berita dari kategori tertentu dari API eksternal.
 */
module.exports = function (app, prefix = '') {

    // URL dasar API eksternal
    const BASE_EXTERNAL_URL = 'https://berita-indo-api-next.vercel.app/api/cnn-news/';

    /**
     * GET /news/cnn/:type
     * Contoh: /news/cnn/gaya-hidup
     */
    app.get(`${prefix}/news/cnn`, async (req, res) => {
        const type = req.params.type;

        // 1. Validasi Kategori
        if (!SUPPORTED_TYPES.includes(type)) {
            return res.status(400).json({
                status: false,
                code: 400,
                message: `Kategori '${type}' tidak didukung untuk CNN News. Kategori yang tersedia: ${SUPPORTED_TYPES.join(', ')}.`
            });
        }

        const EXTERNAL_URL = `${BASE_EXTERNAL_URL}/${type}`;

        try {
            console.log(`[CNN NEWS - ${type.toUpperCase()}] Mengambil data dari: ${EXTERNAL_URL}`);

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
                source: "CNN Indonesia",
                type: type,
                message: data.message || `Berhasil mengambil data berita kategori ${type}.`,
                total_results: cleanedData.length,
                result: cleanedData
            };

            // 5. Mengembalikan response data
            res.json(finalResponse);

        } catch (error) {
            console.error(`[CNN NEWS - ${type.toUpperCase()} API ERROR]:`, error.message);

            const status = error.response ? error.response.status : 500;
            let errorMessage = `Kesalahan tak terduga saat mengambil berita kategori ${type} dari CNN Indonesia.`;

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