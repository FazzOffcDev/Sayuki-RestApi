/**
 * Kuronime Scraper (Latest, Search, Detail)
 */
const axios = require("axios");
const cheerio = require("cheerio");

module.exports = function (app, prefix = '') {
    const BASE_URL = "https://kuronime.biz";

    // Helper untuk membersihkan URL thumbnail
    const cleanThumbnail = (src) => {
        return src ? src.split("?")[0] : null;
    };

    // 1. Fungsi Anime Terbaru (Latest)
    const latest = async () => {
        const { data } = await axios.get(BASE_URL);
        let $ = cheerio.load(data);
        let array = [];

        // Selector untuk Latest Update
        $(".listupd .bsu").each((_, el) => {
            const elJq = $(el);
            const thumbnailSrc = elJq.find(".limit .lazyload").eq(1).attr("data-src");
            
            array.push({
                title: elJq.find(".bsux a").attr("title"),
                url: elJq.find(".bsux a").attr("href"),
                views: elJq.find(".limit .view .post-views-count").text().trim(),
                release: elJq.find(".bt .time").text().trim() + ' yang lalu',
                thumbnail: cleanThumbnail(thumbnailSrc),
            });
        });
        return array.slice(0, 10); // Ambil 10 hasil teratas
    };

    // 2. Fungsi Pencarian (Search)
    const search = async (q) => {
        const { data } = await axios.get(`${BASE_URL}/?s=${encodeURIComponent(q)}`);
        let $ = cheerio.load(data);
        let array = [];

        // Selector untuk hasil pencarian
        $(".listupd .bs").each((_, el) => {
            const elJq = $(el);
            const thumbnailSrc = elJq.find(".limit .lazyload").eq(1).attr("data-src");
            
            array.push({
                title: elJq.find(".bsx a").attr("title"),
                url: elJq.find(".bsx a").attr("href"),
                type: elJq.find(".limit .bt .type").text().trim(),
                score: elJq.find(".rating i").text().trim(),
                thumbnail: cleanThumbnail(thumbnailSrc),
            });
        });
        return array;
    };

    // 3. Fungsi Detail Anime
    const detail = async (url) => {
        const { data } = await axios.get(url);
        let $ = cheerio.load(data);
        let result = {
            metadata: {},
            episodes: [],
        };

        // Scraping Metadata
        $(".infodetail ul li").each((_, el) => {
            const name = $(el).find("b").text().trim();
            const rawValue = $(el).text().replace(name + ":", "").trim();
            
            // Cleaning value for specific fields that might contain resize data
            let cleanValue = rawValue.split("?resize=")[0];
            
            // Format key: "Tanggal Rilis" -> "tanggal_rilis"
            const key = name.toLowerCase().replace(/ /g, '_').replace(/:/g, ''); 
            
            result.metadata[key] = cleanValue;
        });
        
        // Tambahan Metadata
        result.metadata.thumbnail = $(".con .lazyload").attr("data-src");
        result.metadata.synopsis = $(".con .const p").text().trim();

        // Scraping Daftar Episode
        $(".bxcl ul li").each((_, el) => {
            result.episodes.push({
                title: $(el).find(".lchx a").text().trim(),
                url: $(el).find(".lchx a").attr("href"),
            });
        });
        
        // Episode list biasanya dari yang terlama ke terbaru, di-reverse agar terbaru di atas.
        result.episodes.reverse();

        return result;
    };


    // ================== EXPRESS ROUTES ==================

    // A. Latest Anime
    app.get(`${prefix}/scrape/kuronime/latest`, async (req, res) => {
        try {
            const results = await latest();
            res.json({
                status: true,
                message: "Sukses mengambil anime terbaru (latest update) dari Kuronime.",
                data: results
            });
        } catch (error) {
            console.error("[Kuronime Latest] ERROR:", error.message);
            res.status(500).json({
                status: false,
                error: error.message,
                message: "Gagal mengambil data terbaru. Periksa koneksi atau struktur website."
            });
        }
    });

    // B. Search Anime
    app.get(`${prefix}/search/kuronime`, async (req, res) => {
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
                message: `Sukses mencari anime di Kuronime untuk kata kunci: ${q}`,
                data: results
            });
        } catch (error) {
            console.error("[Kuronime Search] ERROR:", error.message);
            res.status(500).json({
                status: false,
                error: error.message,
                message: "Gagal memproses pencarian."
            });
        }
    });

    // C. Detail Anime
    app.get(`${prefix}/info/kuronime/detail`, async (req, res) => {
        const url = req.query.url;
        if (!url || !url.includes(BASE_URL.split('//')[1])) {
            return res.status(400).json({
                status: false,
                message: `Parameter ?url= wajib diisi dengan link detail anime dari Kuronime (e.g., ${BASE_URL}/anime-info/...).`
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
            console.error("[Kuronime Detail] ERROR:", error.message);
            res.status(500).json({
                status: false,
                error: error.message,
                message: "Gagal mengambil detail anime."
            });
        }
    });
};