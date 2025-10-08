const axios = require('axios');

const EXTERNAL_BASE_URL = 'https://berita-indo-api-next.vercel.app/api/republika-news';

// Daftar kategori yang valid
const VALID_TYPES = [
  "news",
  "nusantara",
  "khazanah",
  "islam-digest",
  "internasional",
  "ekonomi",
  "sepakbola",
  "leisure",
];

async function fetchRepublikaNews(type = null) {
    // API eksternal menggunakan path parameter (contoh: /republika-news/news)
    const url = type ? `${EXTERNAL_BASE_URL}/${type}` : EXTERNAL_BASE_URL;

    console.log(`[REPUBLIKA NEWS] Mengambil data dari: ${url}`);

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

module.exports = function (app, prefix = '') {

    // --- ENDPOINT: GET ALL NEWS ATAU FILTER BY TYPE ---
    // GET /news/republika
    // GET /news/republika?type=news
    app.get(`${prefix}/news/republika`, async (req, res) => {
        const typeParam = req.query.type ? req.query.type.toLowerCase() : null; 
        let selectedType = null;
        
        // 1. VALIDASI JIKA PARAMETER 'type' ADA
        if (typeParam) {
            if (!VALID_TYPES.includes(typeParam)) {
                return res.status(400).json({
                    status: false,
                    code: 400,
                    message: `Nilai parameter 'type' tidak valid. Kategori yang tersedia: ${VALID_TYPES.join(', ')}.`,
                    available_types: VALID_TYPES
                });
            }
            selectedType = typeParam;
        }

        try {
            const { messages, cleanedData } = await fetchRepublikaNews(selectedType);

            const sourceName = selectedType ? `Republika News (${selectedType})` : "Republika News (All)";

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
            console.error(`[REPUBLIKA NEWS API ERROR - ${selectedType || 'ALL'}]:`, error.message);
            
            const status = error.response ? error.response.status : 500;
            let errorMessage = "Kesalahan tak terduga saat mengambil daftar berita Republika.";
            
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
