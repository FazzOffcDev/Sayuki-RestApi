/**
 * Samehadaku Scraper (Latest, Search, Detail, Episode Download Links)
 */
const axios = require("axios");
const cheerio = require("cheerio");

module.exports = function (app, prefix = '') {
    const BASE_URL = "https://samehadaku.email"; // Menggunakan .email sesuai kode yang Anda berikan

    // 1. Endpoint Terbaru (Latest)
    const latest = async () => {
        const { data } = await axios.get(BASE_URL);
        const $ = cheerio.load(data);
        let array = [];

        // Selector untuk Latest Episode
        $(".post-show ul li").each((_, el) => {
            const elJq = $(el);
            const url = elJq.find(".thumb > a").attr("href");
            const title = elJq.find(".thumb > a").attr("alt") || elJq.find(".dtla > h2 > a").text().trim(); // Fallback for title
            const thumb = elJq.find(".thumb > a img").attr("src");
            const episode = elJq.find(".dtla > span > author").eq(0).text().trim();
            const author = elJq.find(".dtla > span > author").eq(1).text().trim();
            const releaseText = elJq.find(".dtla > span").eq(2).text().trim();
            const release = releaseText.split(":")[1] ? releaseText.split(":")[1].trim() : releaseText;

            if (url) {
                array.push({
                    title,
                    thumb,
                    episode,
                    author,
                    release,
                    url
                });
            }
        });
        return array;
    };

    // 2. Endpoint Pencarian (Search)
    const search = async (q) => {
        const { data } = await axios.get(`${BASE_URL}/?s=` + encodeURIComponent(q));
        let $ = cheerio.load(data);
        let array = [];

        $(".animepost").each((_, el) => {
            const elJq = $(el);
            const title = elJq.find(".animposx a").attr("alt") || elJq.find(".title a").text().trim();
            const url = elJq.find(".animposx a").attr("href");
            const thumbnail = elJq.find(".animposx a .content-thumb img").attr("src");
            const type = elJq.find(".animposx a .content-thumb .type").text().trim();
            const score = elJq.find(".animposx a .content-thumb .score").text().trim();
            const synopsis = elJq.find(".stooltip .ttls").html() ? elJq.find(".stooltip .ttls").html().trim() : '';

            if (url) {
                array.push({
                    title,
                    type,
                    score,
                    thumbnail,
                    url,
                    synopsis
                });
            }
        });
        return array;
    };

    // 3. Endpoint Detail Anime
    const detail = async (url) => {
        const { data } = await axios.get(url);
        let $ = cheerio.load(data);
        
        // Metadata (Details)
        const infox = $(".infox");
        const thumbnail = $(".thumb img").attr("src");
        
        const animeDetails = {
            title: infox.find(".anim-detail").text().trim() || $("title").text().split("|")[0].trim(),
            japanese: infox.find(".spe span").eq(0).text().replace("Japanese:", "").trim(),
            synonyms: infox.find(".spe span").eq(1).text().replace("Synonyms:", "").trim(),
            english: infox.find(".spe span").eq(2).text().replace("English:", "").trim(),
            status: infox.find(".spe span").eq(3).text().replace("Status:", "").trim(),
            type: infox.find(".spe span").eq(4).text().replace("Type:", "").trim(),
            source: infox.find(".spe span").eq(5).text().replace("Source:", "").trim(),
            duration: infox.find(".spe span").eq(6).text().replace("Duration:", "").trim(),
            totalEpisode: infox.find(".spe span").eq(7).text().replace("Total Episode:", "").trim(),
            season: infox.find(".spe span").eq(8).find("a").text().trim(),
            studio: infox.find(".spe span").eq(9).find("a").text().trim(),
            released: infox.find(".spe span").eq(11).text().replace("Released:", "").trim(),
            thumbnail: thumbnail,
            synopsis: $(".entry-content p").first().text().trim()
        };

        // Episode List
        const eps = [];
        $(".lstepsiode ul li").each((_, el) => {
            eps.push({
                title: $(el).find(".epsleft span > a").text().trim(),
                url: $(el).find(".epsleft span > a").attr("href"),
            });
        });

        return {
            metadata: animeDetails,
            episodes: eps.reverse(), // Reverse to show latest first or keep original order
        };
    };

    // 4. Endpoint Download Episode
    const episode = async (url) => {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        
        // Metadata
        const metadata = {
            title: $("title").text().split("|")[0].trim(),
            genre: $(".infox .genre-info a").map((_, a) => $(a).text().trim()).get(),
            thumbnail: $(".thumb img").attr("src"),
            synopsis: $(".infox .desc .entry-content").text().trim()
        };

        // Download Links
        let downloadLinks = {};
        $(".download-eps ul li").each((_, el) => {
            const quality = $(el).find("strong").text().trim();
            if (quality) {
                downloadLinks[quality] = [];
                $(el).find("span a").each((_, b) => {
                    downloadLinks[quality].push({
                        source: $(b).text().trim(),
                        url: $(b).attr("href"),
                    });
                });
            }
        });

        return {
            metadata,
            download: downloadLinks
        };
    };

    // ================== EXPRESS ROUTES ==================

    // A. Latest Anime
    app.get(`${prefix}/scrape/samehadaku/latest`, async (req, res) => {
        try {
            const results = await latest();
            res.json({
                status: true,
                message: "Sukses mengambil anime terbaru dari Samehadaku.",
                data: results
            });
        } catch (error) {
            console.error("[Samehadaku Latest] ERROR:", error.message);
            res.status(500).json({
                status: false,
                error: error.message,
                message: "Gagal mengambil data terbaru. Periksa koneksi atau struktur website."
            });
        }
    });

    // B. Search Anime
    app.get(`${prefix}/search/samehadaku`, async (req, res) => {
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
                    message: "Pencarian berhasil, namun tidak ada hasil ditemukan.",
                    data: []
                });
            }
            res.json({
                status: true,
                message: `Sukses mencari anime di Samehadaku untuk kata kunci: ${q}`,
                data: results
            });
        } catch (error) {
            console.error("[Samehadaku Search] ERROR:", error.message);
            res.status(500).json({
                status: false,
                error: error.message,
                message: "Gagal memproses pencarian."
            });
        }
    });

    // C. Detail Anime
    app.get(`${prefix}/info/samehadaku/detail`, async (req, res) => {
        const url = req.query.url;
        if (!url || !url.includes(BASE_URL.split('//')[1])) {
            return res.status(400).json({
                status: false,
                message: `Parameter ?url= wajib diisi dengan link detail anime dari Samehadaku (e.g., ${BASE_URL}/anime/...).`
            });
        }

        try {
            const result = await detail(url);
            res.json({
                status: true,
                message: "Sukses mengambil detail anime dan daftar episode.",
                data: result
            });
        } catch (error) {
            console.error("[Samehadaku Detail] ERROR:", error.message);
            res.status(500).json({
                status: false,
                error: error.message,
                message: "Gagal mengambil detail anime."
            });
        }
    });

    // D. Episode Download
    app.get(`${prefix}/download/samehadaku/episode`, async (req, res) => {
        const url = req.query.url;
        if (!url || !url.includes(BASE_URL.split('//')[1])) {
            return res.status(400).json({
                status: false,
                message: `Parameter ?url= wajib diisi dengan link episode Samehadaku (e.g., ${BASE_URL}/episode/...).`
            });
        }

        try {
            const result = await episode(url);
            res.json({
                status: true,
                message: "Sukses mengambil link download episode.",
                data: result
            });
        } catch (error) {
            console.error("[Samehadaku Episode] ERROR:", error.message);
            res.status(500).json({
                status: false,
                error: error.message,
                message: "Gagal mengambil link download episode."
            });
        }
    });
};