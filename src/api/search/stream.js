/**
 * Steam Scraper (Search & Detail using Steam Web API)
 */
const axios = require("axios");
const cheerio = require("cheerio");

module.exports = function (app, prefix = '') {
    const STEAM_SEARCH_URL = "https://store.steampowered.com/api/storesearch";
    const STEAM_DETAIL_URL = "https://store.steampowered.com/api/appdetails";

    // 1. Fungsi Pencarian Game
    const search = async (query) => {
        try {
            // cc=id (Country Code: Indonesia), l=id (Language: Indonesia)
            const response = await axios.get(STEAM_SEARCH_URL, {
                params: {
                    cc: 'id',
                    l: 'id',
                    term: query
                }
            });

            const data = response.data;
            if (!data || !data.items) {
                return [];
            }

            const info = data.items;

            return info.map((a) => {
                let platform = 'N/A';
                if (a.platforms.windows) {
                    platform = 'Windows';
                } else if (a.platforms.mac) {
                    platform = 'Mac';
                } else if (a.platforms.linux) {
                    platform = 'Linux';
                }

                return {
                    name: a.name,
                    id: a.id,
                    price: a.price ?
                        "Rp: " + (a.price.final / 100).toLocaleString('id-ID') : // Steam API price is usually in cents/hundreds, dividing by 100 for Rupiah
                        "Free",
                    score: a.metascore ? a.metascore + "/100" : "N/A",
                    platform: platform,
                    image: a.tiny_image,
                };
            });
        } catch (error) {
            console.error("[Steam Search Error]:", error.message);
            throw new Error("Gagal melakukan pencarian Steam.");
        }
    };

    // 2. Fungsi Detail Game
    const detail = async (appId) => {
        try {
            // cc=id, l=id for localized data
            const response = await axios.get(STEAM_DETAIL_URL, {
                params: {
                    appids: appId,
                    cc: 'id',
                    l: 'id',
                }
            });

            const data = response.data;
            if (!data || !data[appId] || !data[appId].success || !data[appId].data) {
                throw new Error("Detail game tidak ditemukan atau ID aplikasi tidak valid.");
            }

            const info = data[appId].data;
            
            // Extracting description from HTML using Cheerio
            const $ = cheerio.load(info.detailed_description || '');
            const descriptionText = $.text().trim();
            
            const metadata = {
                title: info.name || 'N/A',
                category: info.categories ? info.categories.map((a) => a.description) : [],
                genre: info.genres ? info.genres.map((a) => a.description) : [],
                release: info.release_date.coming_soon ?
                    "Coming soon..." : info.release_date.date || 'N/A',
                free: info.is_free ? "Yes" : "No",
                developer: info.developers || ['N/A'],
                publisher: info.publishers || ['N/A'], // Changed 'developers' to 'publishers' based on common structure
                description: descriptionText,
                price: info.price_overview ? 
                    "Rp: " + (info.price_overview.final / 100).toLocaleString('id-ID') :
                    (info.is_free ? "Free" : "N/A"),
            };

            const json = {
                metadata: metadata,
                screenshot: info.screenshots ? info.screenshots.map((a) => a.path_full) : [],
                movies: info.movies ? info.movies.map((a) => ({
                    title: a.name,
                    id: a.id,
                    thumbnail: a.thumbnail,
                    videos: a.mp4, // Contains multiple resolutions
                })) : [],
            };
            
            return json;

        } catch (error) {
            console.error("[Steam Detail Error]:", error.message);
            throw new Error(`Gagal mengambil detail game Steam: ${error.message}`);
        }
    };

    // ================== EXPRESS ROUTES ==================

    // A. Search Game
    app.get(`${prefix}/search/steam`, async (req, res) => {
        const query = req.query.q;
        if (!query) {
            return res.status(400).json({
                status: false,
                message: "Parameter ?q= (query/kata kunci) wajib diisi."
            });
        }

        try {
            const results = await search(query);
            if (results.length === 0) {
                 return res.json({
                    status: true,
                    message: "Pencarian berhasil, namun tidak ada game ditemukan.",
                    data: []
                });
            }
            res.json({
                status: true,
                message: `Sukses mencari game Steam untuk kata kunci: ${query}`,
                data: results
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message,
                message: "Gagal memproses pencarian Steam. API mungkin bermasalah atau limit terlampaui."
            });
        }
    });

    // B. Detail Game
    app.get(`${prefix}/info/steam/detail`, async (req, res) => {
        const appId = req.query.id;
        if (!appId || isNaN(appId)) {
            return res.status(400).json({
                status: false,
                message: "Parameter ?id= (ID aplikasi/game Steam) wajib diisi dengan angka."
            });
        }

        try {
            const result = await detail(appId);
            res.json({
                status: true,
                message: `Sukses mengambil detail game Steam ID: ${appId}`,
                data: result
            });
        } catch (error) {
            res.status(404).json({
                status: false,
                error: error.message,
                message: "Gagal mengambil detail game Steam. ID tidak valid, atau API tidak mengembalikan data."
            });
        }
    });
};