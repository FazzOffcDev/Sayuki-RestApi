/**
 * SoundCloud Scraper (Search & Download via external service)
 */
const axios = require("axios");
const cheerio = require("cheerio");

module.exports = function (app, prefix = '') {
    const SOUNDCLOUD_URL = "https://soundcloud.com";
    const DOWNLOAD_SERVICE_URL = "https://soundcloudmp3.org";

    // 1. Fungsi Pencarian Lagu
    const search = async (q) => {
        try {
            const {
                data
            } = await axios.get(
                `${SOUNDCLOUD_URL}/search?q=${encodeURIComponent(q)}`,
            );
            const $ = cheerio.load(data);
            const noscriptContents = [];

            // SoundCloud menggunakan SSR, hasilnya sering berada di dalam tag <noscript>
            $("#app > noscript").each((_, i) => {
                noscriptContents.push($(i).html());
            });

            // Biasanya konten yang relevan ada di index tertentu (seperti index 1)
            const relevantHtml = noscriptContents.find(content => content && content.includes('trackListItem')) || noscriptContents[1];
            
            if (!relevantHtml) {
                return [];
            }

            const _$ = cheerio.load(relevantHtml);
            const results = [];
            
            // Mencari link lagu
            _$("ul > li > h2 > a").each((i, u) => {
                const urlPath = $(u).attr("href");
                // Memastikan ini adalah link lagu (bukan profil/playlist)
                if (urlPath && urlPath.split("/").length === 3) {
                    results.push({
                        url: `${SOUNDCLOUD_URL}${urlPath}`,
                        title: $(u).text() || "Tidak ada judul",
                    });
                }
            });

            return results;

        } catch (err) {
            console.error("[SoundCloud Search Error]:", err.message);
            throw new Error("Gagal melakukan pencarian SoundCloud.");
        }
    };

    // 2. Fungsi Download Lagu (Melalui soundcloudmp3.org)
    const download = async (url) => {
        try {
            // Langkah 1: Mendapatkan Token Keamanan (_token)
            // Hapus cookie statis karena akan kadaluarsa atau ditolak.
            const getTokenResponse = await axios.get(DOWNLOAD_SERVICE_URL, {
                headers: {
                    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                },
            });
            const dom = getTokenResponse.data;
            const a = cheerio.load(dom);
            const token = a("input[name='_token']").attr("value");

            if (!token) {
                throw new Error("Gagal mendapatkan token keamanan dari situs converter.");
            }

            // Langkah 2: Mengirim POST request untuk konversi
            const config = {
                _token: token,
                lang: "en",
                url: url,
                submit: "",
            };

            const convertResponse = await axios(
                `${DOWNLOAD_SERVICE_URL}/converter`, {
                    method: "POST",
                    data: new URLSearchParams(Object.entries(config)),
                    headers: {
                        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                        "Content-Type": "application/x-www-form-urlencoded",
                        "Referer": DOWNLOAD_SERVICE_URL,
                    },
                    // Axios tidak secara otomatis membawa sesi/cookie dari request sebelumnya,
                    // jadi kita berharap token saja cukup.
                },
            );

            if (convertResponse.status !== 200) {
                throw new Error(`Permintaan konversi gagal dengan status ${convertResponse.status}.`);
            }

            // Langkah 3: Mengambil hasil konversi
            const $ = cheerio.load(convertResponse.data);
            const result = {};

            // Extract metadata
            $(".info > p").each((_, i) => {
                let name = $(i).find("b").text();
                if (name) {
                     let key = $(i).text().trim().replace(name, "").trim();
                     result[name.split(":")[0].trim().toLowerCase()] = key;
                }
            });
            
            result.thumbnail = $(".info img").attr("src");
            result.download_link = $("#ready-group a").attr("href");

            if (!result.download_link) {
                 // Cek pesan error di halaman
                 const errorMessage = $(".alert-danger").text().trim();
                 if (errorMessage) {
                     throw new Error(`Konversi gagal: ${errorMessage}`);
                 }
                 throw new Error("Link download tidak ditemukan setelah konversi.");
            }
            
            return result;

        } catch (error) {
            console.error("[SoundCloud Download Error]:", error.message);
            // Melaporkan error dengan pesan yang lebih informatif
            throw new Error(`Gagal mengunduh lagu: ${error.message}`);
        }
    };

    // ================== EXPRESS ROUTES ==================

    // A. Search Lagu
    app.get(`${prefix}/search/soundcloud`, async (req, res) => {
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
                message: `Sukses mencari lagu SoundCloud untuk kata kunci: ${q}`,
                data: results
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message,
                message: "Gagal memproses pencarian SoundCloud."
            });
        }
    });

    // B. Download Lagu
    app.get(`${prefix}/download/soundcloud`, async (req, res) => {
        const url = req.query.url;
        if (!url || !url.includes(SOUNDCLOUD_URL.split('//')[1])) {
            return res.status(400).json({
                status: false,
                message: `Parameter ?url= wajib diisi dengan link lagu SoundCloud (e.g., ${SOUNDCLOUD_URL}/user/track).`
            });
        }

        try {
            const result = await download(url);
            res.json({
                status: true,
                message: "Sukses mengambil metadata dan link download lagu SoundCloud.",
                data: result
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message,
                message: "Gagal memproses download lagu SoundCloud. Link mungkin tidak valid atau server converter bermasalah."
            });
        }
    });
};
