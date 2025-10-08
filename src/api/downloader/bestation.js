/**
 * Bstation Scraper and Downloader
 * Menyediakan fungsi pencarian video Bstation dan fungsi download 
 * yang mengandalkan API pihak ketiga untuk mendapatkan link stream langsung.
 */
const axios = require("axios");
const cheerio = require("cheerio");

// Endpoint untuk pencarian video Bstation
module.exports = function (app, prefix = '') {

    /**
     * Fungsi untuk melakukan pencarian di Bstation.
     * @param {string} q Kata kunci pencarian.
     * @returns {Promise<Array>} Array hasil pencarian video.
     */
    const searchBstation = async function (q) {
        try {
            const url = "https://www.bilibili.tv/id/search-result?q=" + encodeURIComponent(q);
            const { data } = await axios.get(url);
            let $ = cheerio.load(data);
            let result = [];

            $(".bstar-video-card").each((index, element) => {
                const videoElement = $(element);
                const coverWrap = videoElement.find(".bstar-video-card__cover-wrap");
                const textWrap = videoElement.find(".bstar-video-card__text-wrap");
                
                const videoLink = coverWrap.find("a").attr("href");
                
                if (!videoLink) return; // Lewati jika tidak ada link

                const videoTitle = textWrap.find(".highlights").text().trim();
                const videoViews = textWrap.find(".bstar-video-card__desc").text().trim();
                const userName = textWrap.find(".bstar-video-card__nickname span").text().trim();
                const videoThumbnail = coverWrap.find("img.bstar-image__img").attr("src");
                const videoDuration = coverWrap.find(".bstar-video-card__cover-mask-text--bold").text().trim();
                const userAvatar = textWrap.find("img.bstar-image__img").attr("src");

                if (videoTitle) {
                    result.push({
                        title: videoTitle,
                        views: videoViews,
                        url: "https:" + videoLink, // Tambahkan protokol
                        thumbnail: videoThumbnail,
                        duration: videoDuration,
                        author: {
                            name: userName,
                            avatar: userAvatar,
                        },
                    });
                }
            });
            return result;
        } catch (error) {
            console.error("Error during Bstation search:", error.message);
            return [];
        }
    };

    /**
     * Fungsi untuk mendapatkan link download langsung dari video Bstation.
     * Menggunakan API proxy pihak ketiga.
     * @param {string} url URL video Bstation lengkap.
     * @returns {Promise<Object>} Metadata dan link download.
     */
    const downloadBstation = async function (url) {
        try {
            // Step 1: Ambil metadata dari halaman video
            const { data: appInfo } = await axios.get(url).catch(e => e.response);
            const $ = cheerio.load(appInfo);
            
            const title = $('meta[property="og:title"]').attr("content")?.split("|")[0].trim() || "Tidak Diketahui";
            const locate = $('meta[property="og:locale"]').attr("content");
            const description = $('meta[property="og:description"]').attr("content");
            const type = $('meta[property="og:video:type"]').attr("content");
            const cover = $('meta[property="og:image"]').attr("content");
            // Scraping detail yang lebih akurat
            const like = $(".interactive__btn.interactive__like .interactive__text").text().trim();
            const views = $(".bstar-meta__tips-left .bstar-meta-text").first().text().trim();

            // Step 2: Gunakan API proxy pihak ketiga untuk mendapatkan link download
            const proxyResponse = await axios.post(
                "https://c.blahaj.ca/", 
                { url: url }, 
                {
                    headers: {
                        Accept: "application/json",
                        "Content-type": "application/json",
                    },
                }
            ).catch((e) => e.response);
            
            const data = proxyResponse.data;

            if (!data || !data.url) {
                throw new Error("Gagal mendapatkan link download dari API proxy.");
            }

            return {
                metadata: {
                    title: title,
                    locate: locate,
                    thumbnail: cover,
                    like: like,
                    view: views,
                    description: description
                },
                download: {
                    url: data.url,
                    filename: data.filename || `${title}.mp4`,
                    type: type,
                },
            };
        } catch (e) {
            console.error("Error during Bstation download:", e.message);
            throw new Error(`Gagal mengunduh video Bstation: ${e.message}`);
        }
    };
    
    // ================== ENDPOINTS ==================

    // 1. Endpoint Pencarian
    app.get(`${prefix}/search/bstation`, async (req, res) => {
        const q = req.query.q;
        if (!q) {
            return res.status(400).json({
                status: false,
                message: "Parameter ?q= (query/kata kunci) wajib diisi."
            });
        }
        
        try {
            const results = await searchBstation(q);
            if (results.length === 0) {
                 return res.json({
                    status: true,
                    message: "Pencarian berhasil, namun tidak ada hasil ditemukan.",
                    data: []
                });
            }
            res.json({
                status: true,
                message: `Sukses mencari video Bstation untuk kata kunci: ${q}`,
                data: results
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: "Kesalahan saat memproses pencarian Bstation.",
                detail: error.message
            });
        }
    });

    // 2. Endpoint Download
    app.get(`${prefix}/download/bstation`, async (req, res) => {
        const url = req.query.url;

        if (!url || !url.includes('bilibili.tv')) {
            return res.status(400).json({
                status: false,
                message: "Parameter ?url= wajib diisi dengan link video Bstation yang valid (e.g., https://www.bilibili.tv/id/video/...).",
            });
        }

        try {
            const result = await downloadBstation(url);
            res.json({
                status: true,
                message: "Sukses mengambil link download Bstation.",
                data: result
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: "Kesalahan saat memproses download Bstation.",
                detail: error.message
            });
        }
    });
};
