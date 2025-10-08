/**
 * Facebook & Instagram Downloader (via Snapsave.app Scraper)
 * Menggunakan logika decoding kompleks dari Snapsave untuk mendapatkan link download.
 * CATATAN: Karena ketergantungan pada obfuscation JavaScript Snapsave, fitur ini SANGAT rentan terhadap perubahan di situs target.
 */
module.exports = function (app, prefix = '') {
    const axios = require("axios");
    const cheerio = require("cheerio");

    // --- Helper Functions (untuk decoding Snapsave's obfuscated JS) ---

    function decodeData(data) {
        let [part1, part2, part3, part4, part5] = data;

        function decodeSegment(segment, base, length) {
            const charSet =
                "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/".split(
                    "",
                );
            let baseSet = charSet.slice(0, base);
            let decodeSet = charSet.slice(0, length);

            let decodedValue = segment
                .split("")
                .reverse()
                .reduce((accum, char, index) => {
                    if (baseSet.indexOf(char) !== -1) {
                        return (accum += baseSet.indexOf(char) * Math.pow(base, index));
                    }
                }, 0);

            let result = "";
            while (decodedValue > 0) {
                result = decodeSet[decodedValue % length] + result;
                decodedValue = Math.floor(decodedValue / length);
            }

            return result || "0";
        }

        let part6 = ""; // Re-init part6
        for (let i = 0, len = part1.length; i < len; i++) {
            let segment = "";
            
            // Loop while character is not the delimiter (part3[part5])
            while (part1[i] !== part3[part5]) { 
                segment += part1[i];
                i++;
            }

            for (let j = 0; j < part3.length; j++) {
                segment = segment.replace(new RegExp(part3[j], "g"), j.toString());
            }
            part6 += String.fromCharCode(
                decodeSegment(segment, part5, 10) - part4,
            );
        }
        return decodeURIComponent(encodeURIComponent(part6));
    }

    function extractParams(data) {
        const match = data.split('decodeURIComponent(escape(r))}(')[1]?.split('))')[0];
        if (!match) {
            throw new Error("Gagal mengekstrak parameter decoding dari Snapsave.");
        }
        return match
            .split(",")
            .map((item) => item.replace(/"/g, "").trim());
    }

    function extractDownloadUrl(data) {
        const match = data.split('getElementById("download-section").innerHTML = "')[1]?.split('"; document.getElementById("inputData").remove(); ')[0];
        if (!match) {
            throw new Error("Gagal mengekstrak konten download HTML dari script ter-decode.");
        }
        return match.replace(/\\(\\)?/g, ""); 
    }

    function getVideoUrl(data) {
        // Melakukan urutan decoding: extract params -> decode data -> extract final HTML
        return extractDownloadUrl(decodeData(extractParams(data)));
    }
    
    // --- Main Scraper Function ---

    const snapsaveDownload = async (url) => {
        // Validasi URL (sesuai kode yang Anda berikan)
        if (
            !url.match(/(?:https?:\/\/(web\.|www\.|m\.)?(facebook|fb)\.(com|watch)\S+)?$/) &&
            !url.match(/(https|http):\/\/www.instagram.com\/(p|reel|tv|stories)/gi)
        ) {
            throw new Error("URL tidak valid untuk Facebook atau Instagram.");
        }
        
        const response = await axios.post(
            "https://snapsave.app/action.php?lang=id",
            // Mengirim data form
            "url=" + url, {
                headers: {
                    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
                    "content-type": "application/x-www-form-urlencoded",
                    origin: "https://snapsave.app",
                    referer: "https://snapsave.app/id",
                    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36",
                },
            },
        );

        const data = response.data;
        
        // 1. Decode respons yang dienkripsi
        const videoPageContent = getVideoUrl(data);
        
        // 2. Scrape konten HTML hasil decode
        const $ = cheerio.load(videoPageContent);
        const results = {
            title: $('h5.text-left.my-2').text().trim() || null,
            description: $('h5.text-left.my-2').next('p').text().trim() || null,
            thumbnail: $('div.download-items__thumb img').attr('src') || null,
            links: []
        };
        
        // Ekstrak semua link download
        $('div.download-items__btn').each((btnIndex, button) => {
            const linkElement = $(button).find('a');
            let downloadUrl = linkElement.attr("href");
            const quality = linkElement.text().trim() || 'Download';
            
            if (downloadUrl) {
                // Pastikan URL bersifat absolut
                if (!/https?:\/\//.test(downloadUrl)) {
                    downloadUrl = "https://snapsave.app" + downloadUrl;
                }
                
                results.links.push({
                    quality: quality,
                    url: downloadUrl
                });
            }
        });

        if (results.links.length === 0) {
            throw new Error("Tidak ada tautan unduhan video/gambar yang ditemukan. Coba lagi atau cek link Anda.");
        }

        return results;
    };
    
    // --- ENDPOINT EXPRESS.JS ---
    app.get(`${prefix}/download/snapsave`, async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                status: false,
                code: 400,
                message: "Parameter ?url= wajib diisi dengan link video Facebook atau Instagram."
            });
        }

        try {
            console.log(`[Snapsave Downloader] Memproses URL: ${url}`);
            
            const results = await snapsaveDownload(url);

            res.json({
                status: true,
                code: 200,
                message: "Link unduhan dari Snapsave berhasil diambil.",
                data: results
            });

        } catch (err) {
            let errorMessage = err.message || "Gagal memproses Snapsave Downloader. Coba pastikan link valid atau Snapsave.app telah memperbarui sistemnya.";

            console.error("[Snapsave Downloader] ERROR:", err.message);
            res.status(500).json({
                status: false,
                error: errorMessage,
                message: `Gagal memproses permintaan Snapsave Downloader: ${errorMessage}`
            });
        }
    });
};
