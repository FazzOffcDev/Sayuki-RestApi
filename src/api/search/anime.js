const axios = require('axios');

/**
 * Endpoint Pemetaan Relasi Anime (Anime Relation Mapping):
 * Mengambil ID anime yang terhubung dari berbagai database berdasarkan ID di platform tertentu.
 */
module.exports = function (app, prefix = '') {

    // URL dasar AnimeAPI
    const BASE_EXTERNAL_URL = 'https://animeapi.my.id/';

    // Daftar alias platform yang didukung (disederhanakan)
    const SUPPORTED_PLATFORMS = [
        'ad', 'al', 'an', 'ap', 'as', 'ac', 'im', 'kz', 'kt', 'lc', 'ma', 'nj', 
        'nf', 'oo', 'sh', 'sb', 'sy', 'sm', 'tm', 'tr',
        // Alias lain yang lebih panjang diabaikan di sini untuk validasi sederhana,
        // API eksternal akan menanganinya.
    ];

    /**
     * GET /anime/map/:platform/:mediaid
     * Contoh: /anime/map/mal/1 (untuk ID MyAnimeList 1)
     */
    app.get(`${prefix}/anime/map`, async (req, res) => {
        const { platform, mediaid } = req.params;
        const normalizedPlatform = platform;

        // Konstruksi URL API eksternal
        // Media ID harus dikirim apa adanya, karena dapat berisi slash (/) untuk Trakt/TMDB.
        const EXTERNAL_URL = `${BASE_EXTERNAL_URL}${normalizedPlatform}/${mediaid}`;

        try {
            console.log(`[ANIME MAP - ${normalizedPlatform}] Mengambil data dari: ${EXTERNAL_URL}`);

            // 1. Melakukan request ke server eksternal
            const response = await axios.get(EXTERNAL_URL);
            
            const mappingData = response.data; 

            // 2. Membuat struktur respons akhir
            const finalResponse = {
                status: true,
                code: 200,
                source: "AnimeAPI (nattadasu)",
                query: {
                    platform: platform,
                    media_id: mediaid
                },
                message: mappingData.title || `Berhasil memetakan relasi anime untuk ID ${mediaid} di platform ${platform}.`,
                result: mappingData
            };

            // 3. Mengembalikan response data
            res.json(finalResponse);

        } catch (error) {
            console.error(`[ANIME MAP API ERROR ${normalizedPlatform}/${mediaid}]:`, error.message);

            const status = error.response ? error.response.status : 500;
            let errorMessage = "Kesalahan tak terduga saat mengambil data pemetaan anime.";
            
            if (status === 404) {
                 errorMessage = `Anime dengan ID '${mediaid}' di platform '${platform}' tidak ditemukan. Mohon periksa ID, platform, atau format ID (untuk Trakt/TMDB/Kitsu).`;
            } else if (error.response && error.response.data && error.response.data.message) {
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