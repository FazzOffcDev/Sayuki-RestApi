const axios = require('axios');

const EXTERNAL_BASE_URL = 'https://berita-indo-api-next.vercel.app/api/tribun-news';

// Daftar zona dan kategori yang valid
const VALID_ZONES = [
  "jakarta", "jabar", "mataram", "mataraman", "medan", "padang", "flores", 
  "sulbar", "ambon", "wartakota", "bogor", "pantura", "madura", "palembang", 
  "pekanbaru", "banjarmasin", "pontianak", "papua", "bekasi", "cirebon", 
  "jogja", "bali", "bangka", "jambi", "kaltim", "palu", "papuabarat", 
  "banten", "jateng", "jatim", "aceh", "batam", "sumsel", "kalteng", 
  "makassar", "tangerang", "solo", "surabaya", "prohaba", "belitung", 
  "lampung", "kaltara", "lombok", "depok", "banyumas", "suryamalang", 
  "sultra", "babel", "kupang", "manado", "ternate",
];

const VALID_TYPES = [
  "bisnis", "superskor", "sport", "seleb", "lifestyle", "travel", 
  "parapuan", "otomotif", "techno", "ramadan",
];

async function fetchTribunNews(zone = null, type = null) {
    let url = EXTERNAL_BASE_URL;
    
    // Kunci: API eksternal menggunakan path parameter (contoh: /tribun-news/jakarta/bisnis)
    if (zone && type) {
        url = `${EXTERNAL_BASE_URL}/${zone}/${type}`;
    }

    console.log(`[TRIBUN NEWS] Mengambil data dari: ${url}`);

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

    // --- ENDPOINT: GET ALL NEWS ATAU FILTER BY ZONE & TYPE ---
    // GET /news/tribun
    // GET /news/tribun?zone=jakarta&type=bisnis
    app.get(`${prefix}/news/tribun`, async (req, res) => {
        const zoneParam = req.query.zone ? req.query.zone.toLowerCase() : null; 
        const typeParam = req.query.type ? req.query.type.toLowerCase() : null; 
        
        let selectedZone = null;
        let selectedType = null;
        let errorMessage = null;

        // Jika hanya salah satu parameter yang ada, atau keduanya ada tetapi tidak valid
        if (zoneParam || typeParam) {
            // Jika salah satu ada, keduanya harus ada dan valid.
            if (!zoneParam || !typeParam) {
                errorMessage = "Untuk filter spesifik, parameter 'zone' dan 'type' wajib diisi bersamaan.";
            } else if (!VALID_ZONES.includes(zoneParam)) {
                errorMessage = `Nilai parameter 'zone' (${zoneParam}) tidak valid.`;
            } else if (!VALID_TYPES.includes(typeParam)) {
                errorMessage = `Nilai parameter 'type' (${typeParam}) tidak valid.`;
            }
        }
        
        if (errorMessage) {
            return res.status(400).json({
                status: false,
                code: 400,
                message: errorMessage,
                available_zones: VALID_ZONES,
                available_types: VALID_TYPES
            });
        }
        
        // Tetapkan parameter jika valid
        selectedZone = zoneParam;
        selectedType = typeParam;

        try {
            const { messages, cleanedData } = await fetchTribunNews(selectedZone, selectedType);

            const sourceName = (selectedZone && selectedType) 
                ? `Tribun News (${selectedZone}/${selectedType})` 
                : "Tribun News (All)";

            const finalResponse = {
                status: true,
                code: 200,
                source: sourceName,
                query_zone: selectedZone,
                query_type: selectedType,
                message: messages,
                total_results: cleanedData.length,
                result: cleanedData
            };
            
            res.json(finalResponse);

        } catch (error) {
            console.error(`[TRIBUN NEWS API ERROR - ${selectedZone || 'ALL'}/${selectedType || 'ALL'}]:`, error.message);
            
            const status = error.response ? error.response.status : 500;
            let errMessage = "Kesalahan tak terduga saat mengambil daftar berita Tribun.";
            
            if (error.response && error.response.data && error.response.data.messages) {
                errMessage = error.response.data.messages;
            }
            
            res.status(status).json({
                status: false,
                code: status,
                message: errMessage
            });
        }
    });
};
