const axios = require('axios');

// URL API eksternal yang digunakan (sesuai permintaan: /api/kumparan-news)
const EXTERNAL_URL = 'https://berita-indo-api-next.vercel.app/api/kumparan-news';

/**
 * Fungsi pembantu untuk mengambil dan memproses berita dari Kumparan.
 */
async function fetchKumparanNews() {
    console.log(`[KUMPARAN NEWS] Mengambil data dari: ${EXTERNAL_URL}`);

    const response = await axios.get(EXTERNAL_URL);
    const data = response.data;

    // Pastikan data memiliki properti 'data' berupa array
    if (!data.data || !Array.isArray(data.data)) {
        return { messages: data.messages || "Tidak ada data berita yang ditemukan.", cleanedData: [] };
    }

    const cleanedData = data.data.map(news => ({
        title: news.title,
        link: news.link,
        snippet: news.contentSnippet,
        published_at: news.isoDate,
        image: news.image ? {
            small: news.image.small,
            large: news.image.large
        } : null
    }));

    return {
        messages: data.messages || "Berhasil mengambil data berita.",
        cleanedData
    };
}


/**
 * Endpoint Berita Kumparan: Mengambil daftar semua berita terbaru.
 */
module.exports = function (app, prefix = '') {

    // --- ENDPOINT: GET ALL NEWS ---
    // GET /news/kumparan
    app.get(`${prefix}/news/kumparan`, async (req, res) => {
        try {
            const { messages, cleanedData } = await fetchKumparanNews();

            const finalResponse = {
                status: true,
                code: 200,
                source: "Kumparan News",
                message: messages,
                total_results: cleanedData.length,
                result: cleanedData
            };
            
            res.json(finalResponse);

        } catch (error) {
            console.error("[KUMPARAN NEWS API ERROR]:", error.message);
            
            const status = error.response ? error.response.status : 500;
            let errorMessage = "Kesalahan tak terduga saat mengambil daftar berita Kumparan.";
            
            if (error.response && error.response.data && error.response.data.messages) {
                errorMessage = error.response.data.messages;
            }
            
            res.status(status).json({
                status: false,
                code: status,
                message: errorMessage
            });
        }
    });
};