/**
 * SnackVideo Scraper (Search & Download)
 */
const axios = require("axios");
const cheerio = require("cheerio");

module.exports = function (app, prefix = '') {
    const BASE_URL = "https://www.snackvideo.com";

    // 1. Fungsi Pencarian Video
    const search = async (q) => {
        try {
            const response = await axios.get(`${BASE_URL}/discover/${encodeURIComponent(q)}`);
            const $ = cheerio.load(response.data);
            
            // Mencari JSON terstruktur yang disematkan di dalam script/div
            const content = $("#ItemList").text().trim();
            
            if (!content) {
                // Coba selector alternatif jika ItemList kosong (biasanya di tag <script type="application/ld+json">)
                let altContent = $('script[type="application/ld+json"]').text().trim();
                if (altContent) {
                    // Cari array video di dalam JSON yang lebih besar
                    const fullJson = JSON.parse(altContent);
                    if (fullJson && fullJson.mainContentOfPage && fullJson.mainContentOfPage.hasPart) {
                         // Ambil array yang berisi data video
                         const videoList = fullJson.mainContentOfPage.hasPart.filter(item => item['@type'] === 'VideoObject');
                         if (videoList.length > 0) {
                             return videoList.map((a) => ({
                                 title: a.name,
                                 thumbnail: a.thumbnailUrl ? a.thumbnailUrl[0] : null,
                                 uploaded: new Date(a.uploadDate).toLocaleString('en-US'),
                                 stats: {
                                     watch: a.interactionStatistic[0]?.userInteractionCount || 0,
                                     likes: a.interactionStatistic[1]?.userInteractionCount || 0,
                                     comment: a.commentCount || 0,
                                     share: a.interactionStatistic[2]?.userInteractionCount || 0,
                                 },
                                 author: {
                                     name: a.creator.mainEntity.name,
                                     alt_name: a.creator.mainEntity.alternateName,
                                     bio: a.creator.mainEntity.description,
                                     avatar: a.creator.mainEntity.image,
                                     stats: {
                                         likes: a.creator.mainEntity.interactionStatistic[0]?.userInteractionCount || 0,
                                         followers: a.creator.mainEntity.interactionStatistic[1]?.userInteractionCount || 0
                                     }
                                 },
                                 url: a.url
                             }));
                         }
                    }
                }
                return []; // Video tidak ditemukan
            }

            // Proses JSON dari #ItemList (Struktur JSON yang diberikan)
            let json = JSON.parse(content);
            
            const result = json.map((a) => a.innerHTML).map((a) => ({
                title: a.name,
                thumbnail: a.thumbnailUrl[0],
                uploaded: new Date(a.uploadDate).toLocaleString('en-US'),
                stats: {
                    watch: a.interactionStatistic[0].userInteractionCount,
                    likes: a.interactionStatistic[1].userInteractionCount,
                    comment: a.commentCount,
                    share: a.interactionStatistic[2].userInteractionCount,
                },
                author: {
                    name: a.creator.mainEntity.name,
                    alt_name: a.creator.mainEntity.alternateName,
                    bio: a.creator.mainEntity.description,
                    avatar: a.creator.mainEntity.image,
                    stats: {
                        likes: a.creator.mainEntity.interactionStatistic[0].userInteractionCount,
                        followers: a.creator.mainEntity.interactionStatistic[1].userInteractionCount
                    }
                },
                url: a.url
            }));
            
            return result;

        } catch (error) {
            console.error("SnackVideo Search Error:", error.message);
            throw new Error(error.message);
        }
    };

    // 2. Fungsi Unduh Video
    const download = async (url) => {
        try {
            const response = await axios.get(url);
            const $ = cheerio.load(response.data);
            
            const videoObjectScript = $("#VideoObject").text().trim();
            if (!videoObjectScript) {
                 // Coba selector alternatif untuk VideoObject JSON
                 const altVideoObject = $('script[type="application/ld+json"]').filter((i, el) => {
                     const jsonText = $(el).html();
                     return jsonText.includes('"@type": "VideoObject"');
                 }).html();
                 
                 if (!altVideoObject) {
                     throw new Error("VideoObject JSON tidak ditemukan. Link mungkin tidak valid.");
                 }
                 var json = JSON.parse(altVideoObject);

            } else {
                 var json = JSON.parse(videoObjectScript);
            }
            
            const result = {
                metadata: {},
                download: null
            };

            result.metadata.title = json.name;
            result.metadata.thumbnail = json.thumbnailUrl ? json.thumbnailUrl[0] : null;
            result.metadata.uploaded = new Date(json.uploadDate).toLocaleString('en-US');
            result.metadata.comment = json.commentCount;
            result.metadata.watch = json.interactionStatistic[0]?.userInteractionCount || 0;
            result.metadata.likes = json.interactionStatistic[1]?.userInteractionCount || 0;
            result.metadata.share = json.interactionStatistic[2]?.userInteractionCount || 0;
            result.metadata.author = json.creator.mainEntity.name;
            result.download = json.contentUrl; // Ini adalah link download langsung
            
            return result;

        } catch (error) {
            console.error("SnackVideo Download Error:", error.message);
            throw new Error(error.message);
        }
    };

    // ================== EXPRESS ROUTES ==================

    // A. Search Video
    app.get(`${prefix}/search/snackvideo`, async (req, res) => {
        const q = req.query.q;
        if (!q) {
            return res.status(400).json({
                status: false,
                message: "Parameter ?q= (query/kata kunci) wajib diisi."
            });
        }

        try {
            const results = await search(q);
            if (results.length === 0) {
                 return res.json({
                    status: true,
                    message: "Pencarian berhasil, namun tidak ada video ditemukan.",
                    data: []
                });
            }
            res.json({
                status: true,
                message: `Sukses mencari video SnackVideo untuk kata kunci: ${q}`,
                data: results
            });
        } catch (error) {
            console.error("[SnackVideo Search] ERROR:", error.message);
            res.status(500).json({
                status: false,
                error: error.message,
                message: "Gagal memproses pencarian. Mungkin URL pencarian tidak valid atau struktur HTML berubah."
            });
        }
    });

    // B. Download Video
    app.get(`${prefix}/download/snackvideo`, async (req, res) => {
        const url = req.query.url;
        if (!url || !url.includes(BASE_URL.split('//')[1])) {
            return res.status(400).json({
                status: false,
                message: `Parameter ?url= wajib diisi dengan link video SnackVideo (e.g., ${BASE_URL}/v/...).`
            });
        }

        try {
            const result = await download(url);
            if (!result.download) {
                return res.status(404).json({
                    status: false,
                    message: "Link download video tidak ditemukan. Video mungkin sudah dihapus atau link tidak valid."
                });
            }
            res.json({
                status: true,
                message: "Sukses mengambil metadata dan link download video SnackVideo.",
                data: result
            });
        } catch (error) {
            console.error("[SnackVideo Download] ERROR:", error.message);
            res.status(500).json({
                status: false,
                error: error.message,
                message: "Gagal mengambil link download video. Periksa link yang diberikan."
            });
        }
    });
};