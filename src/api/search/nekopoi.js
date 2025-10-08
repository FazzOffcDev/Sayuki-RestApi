/**
 * Nekopoi Scraper (Latest, Search, Detail, Episode Links)
 */
const axios = require("axios");
const cheerio = require("cheerio");

module.exports = function (app, prefix = '') {
    const BASE_URL = "https://nekopoi.care";

    // 1. Fungsi Anime Terbaru (Latest)
    const latest = async () => {
        const { data } = await axios.get(BASE_URL);
        const $ = cheerio.load(data);
        let series = [];
        let episode = [];

        // Scraping Series yang Sedang Berjalan (Latest Update Series)
        $(".animeseries ul li").each((_, i) => {
            const html = $(i).find("a").attr("original-title");
            if (!html) return;
            
            const exec = cheerio.load(html);
            let info = {};
            
            exec(".areadetail p").each((_, oh) => {
                let name = exec(oh).find("b").text().trim();
                let key = exec(oh).text().replace(name + ":", "").trim();
                // Format key: "tipe" -> "tipe"
                info[name.split(" ").join("_").toLowerCase().trim()] = key;
            });
            
            series.push({
                title: exec(".infoarea h2").eq(0).text().trim(),
                thumbnail: exec(".areabaru img").attr("src"),
                ...info,
                url: $(i).find("a").attr("href"),
            });
        });

        // Scraping Episode Terbaru
        $("#boxid .eropost").each((_, i) => {
            episode.push({
                title: $(i).find(".eroinfo h2 a").text().trim(),
                release: $(i).find(".eroinfo span").eq(0).text().trim(),
                url: $(i).find(".eroinfo h2 a").attr("href"),
            });
        });

        return { series, episode };
    };

    // 2. Fungsi Detail Series
    const detail = async (url) => {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        let result = {
            metadata: {},
            episodes: []
        };

        // Scraping Metadata
        $(".animeinfos .listinfo ul li").each((_, i) => {
            let name = $(i).find("b").text().trim();
            let key = $(i).text().trim().replace(name + ":", "").trim();
            result.metadata[name.toLowerCase()] = key;
        });

        result.metadata.thumbnail = $(".animeinfos .imgdesc img").attr("src");
        result.metadata.sinopsis = $(".animeinfos p").text().trim();

        // Scraping Daftar Episode
        $(".animeinfos .episodelist ul li").each((_, i) => {
            result.episodes.push({
                title: $(i).find("span").eq(0).find("a").text().trim(),
                release: $(i).find("span").eq(1).text().trim(),
                url: $(i).find("span").eq(0).find("a").attr("href")
            });
        });

        return result;
    };

    // 3. Fungsi Link Episode (Streaming & Download)
    const episode = async (url) => {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const result = {
            metadata: {},
            download: []
        };

        $(".contentpost").each((_, el) => {
            result.metadata.title = $(el).find("img").attr("title");
            result.metadata.images = $(el).find("img").attr("src");
            
            // Mencoba mendapatkan sinopsis dari elemen p kedua
            result.metadata.synopsis = $(el).find(".konten").find("p:nth-of-type(2)").text().trim() || 
                                       $(el).find(".konten").find("p").first().text().trim();
        });

        // Link Streaming
        result.metadata.stream = $("#show-stream").find("#stream1 iframe").attr("src");

        // Link Download
        $(".liner").each((_, el) => {
            const name = $(el).find(".name").text().trim();
            const links = [];
            
            $(el).find(".listlink a").each((_, link) => {
                links.push({
                    name: $(link).text().trim(),
                    url: $(link).attr("href"),
                });
            });

            if (name && links.length > 0) {
                result.download.push({
                    title: name,
                    source: links,
                });
            }
        });

        return result;
    };

    // 4. Fungsi Pencarian (Search)
    const search = async (q) => {
        const { data } = await axios.get(`${BASE_URL}/?s=${encodeURIComponent(q)}`);
        const $ = cheerio.load(data);
        const results = [];
        
        $(".result ul li").each((_, el) => {
            const link = $(el).find("h2 a").attr("href");
            if (link) {
                results.push({
                    title: $(el).find("h2 a").text().trim(),
                    type: link.includes("/hentai/") ? "Hentai Series" : "Hentai Episodes",
                    images: $(el).find("img").attr("src"),
                    url: link,
                });
            }
        });

        return results;
    };

    // ================== EXPRESS ROUTES ==================

    // A. Latest Updates
    app.get(`${prefix}/scrape/nekopoi/latest`, async (req, res) => {
        try {
            const results = await latest();
            res.json({
                status: true,
                message: "Sukses mengambil series dan episode terbaru dari Nekopoi.",
                data: results
            });
        } catch (error) {
            console.error("[Nekopoi Latest] ERROR:", error.message);
            res.status(500).json({
                status: false,
                error: error.message,
                message: "Gagal mengambil data terbaru. Periksa koneksi atau struktur website."
            });
        }
    });

    // B. Search
    app.get(`${prefix}/search/nekopoi`, async (req, res) => {
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
                message: `Sukses mencari konten di Nekopoi untuk kata kunci: ${q}`,
                data: results
            });
        } catch (error) {
            console.error("[Nekopoi Search] ERROR:", error.message);
            res.status(500).json({
                status: false,
                error: error.message,
                message: "Gagal memproses pencarian."
            });
        }
    });

    // C. Detail Series
    app.get(`${prefix}/info/nekopoi/detail`, async (req, res) => {
        const url = req.query.url;
        if (!url || !url.includes(BASE_URL.split('//')[1])) {
            return res.status(400).json({
                status: false,
                message: `Parameter ?url= wajib diisi dengan link detail series dari Nekopoi (e.g., ${BASE_URL}/hentai/...).`
            });
        }

        try {
            const result = await detail(url);
            res.json({
                status: true,
                message: "Sukses mengambil detail series, sinopsis, dan daftar episode.",
                data: result
            });
        } catch (error) {
            console.error("[Nekopoi Detail] ERROR:", error.message);
            res.status(500).json({
                status: false,
                error: error.message,
                message: "Gagal mengambil detail series."
            });
        }
    });

    // D. Episode Links (Streaming & Download)
    app.get(`${prefix}/info/nekopoi/episode`, async (req, res) => {
        const url = req.query.url;
        if (!url || !url.includes(BASE_URL.split('//')[1])) {
            return res.status(400).json({
                status: false,
                message: `Parameter ?url= wajib diisi dengan link episode dari Nekopoi (e.g., ${BASE_URL}/video/...).`
            });
        }

        try {
            const result = await episode(url);
            res.json({
                status: true,
                message: "Sukses mengambil link streaming dan download episode.",
                data: result
            });
        } catch (error) {
            console.error("[Nekopoi Episode] ERROR:", error.message);
            res.status(500).json({
                status: false,
                error: error.message,
                message: "Gagal mengambil link episode."
            });
        }
    });
};
