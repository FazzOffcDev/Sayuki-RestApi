const axios = require('axios');

// URL API eksternal yang digunakan
const EXTERNAL_BASE_URL = 'https://berita-indo-api-next.vercel.app/api/cnbc-news';

// Daftar kategori yang valid yang dapat dimasukkan oleh pengguna
const VALID_TYPES = [
  "market",
  "news",
  "entrepreneur",
  "syariah",
  "tech",
  "lifestyle",
];

/**
 * Fungsi pembantu untuk mengambil dan memproses berita dari CNBC.
 * @param {string|null} type - Kategori berita, atau null untuk semua.
 */
async function fetchCNBCNews(type = null) {
    // Kunci: Jika 'type' ada, URL API eksternal menggunakan path parameter (cnbc-news/market).
    const url = type ? `${EXTERNAL_BASE_URL}/${type}` : EXTERNAL_BASE_URL;

    console.log(`[CNBC NEWS] Mengambil data dari: ${url}`);

    const response = await axios.get(url);
    const data = response.data;

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
 * Endpoint Berita CNBC: Mengambil daftar berita terbaru.
 */
module.exports = function (app, prefix = '') {

    // --- ENDPOINT: GET ALL NEWS ATAU FILTER BY QUERY PARAMETER ---
    // GET /news/cnbc (All)
    // GET /news/cnbc?type=market (Filter)
    app.get(`${prefix}/news/cnbc`, async (req, res) => {
        // MENGAMBIL PARAMETER DARI QUERY STRING
        const typeParam = req.query.type ? req.query.type.toLowerCase() : null; 

        let selectedType = null;
        
        // 1. VALIDASI TIPE BERITA JIKA PARAMETER 'type' ADA
        if (typeParam) {
             // Cek apakah tipe yang diketik pengguna valid
            if (!VALID_TYPES.includes(typeParam)) {
                // Mengembalikan error 400 Bad Request jika parameter tidak valid
                return res.status(400).json({
                    status: false,
                    code: 400,
                    // Pesan error yang sangat jelas
                    message: `Nilai parameter 'type' tidak valid. Gunakan salah satu kategori yang tersedia. Contoh: /news/cnbc?type=market`,
                    available_types: VALID_TYPES
                });
            }
            selectedType = typeParam;
        }

        try {
            // Jika typeParam null, ia akan mengambil semua berita (All)
            // Jika typeParam valid, ia akan mengambil berita berdasarkan tipe
            const { messages, cleanedData } = await fetchCNBCNews(selectedType);

            const sourceName = selectedType ? `CNBC News (${selectedType})` : "CNBC News (All)";

            const finalResponse = {
                status: true,
                code: 200,
                source: sourceName,
                query_type: selectedType,
                message: messages,
                total_results: cleanedData.length,
                result: cleanedData
            };
            
            res.json(finalResponse);

        } catch (error) {
            console.error(`[CNBC NEWS API ERROR - ${selectedType || 'ALL'}]:`, error.message);
            
            const status = error.response ? error.response.status : 500;
            let errorMessage = "Kesalahan tak terduga saat mengambil daftar berita CNBC.";
            
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