/**
 * Multi-Step File Downloader Tool
 * Mengunduh file dari layanan file-hosting yang memerlukan multiple redirect/token steps.
 * (Umumnya untuk situs seperti Sfile.mobi, dll.)
 */
module.exports = function (app, prefix = '') {
    const axios = require("axios");
    const cheerio = require("cheerio");

    app.get(`${prefix}/download/sfile`, async (req, res) => {
        const url = req.query.url;

        if (!url) {
            return res.status(400).json({
                status: false,
                code: 400,
                message: "Parameter ?url= wajib diisi dengan link file yang akan diunduh."
            });
        }
        
        try {
            const headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36 Edg/117.0.2045.47",
                Referer: url,
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
            };

            // Step 1: Initial GET request to the file page
            const {
                data: info,
                headers: responseHeaders
            } = await axios.get(url, {
                headers: headers,
            }).catch(e => e.response);
            
            if (!info) {
                return res.status(404).json({
                    status: false,
                    message: "Gagal mengambil halaman file. URL mungkin tidak valid atau file tidak ditemukan."
                });
            }

            // Extract cookies for subsequent requests
            const cookies =
                responseHeaders["set-cookie"]
                ?.map((cookie) => cookie.split(";")[0])
                .join("; ") || "";
            headers.Cookie = cookies;

            let $ = cheerio.load(info);
            let metadata = {};
            
            // Extract metadata using the provided selectors
            $(".file-content").eq(0).each((a, i) => {
                metadata.filename = $(i).find("img").attr("alt");
                // Safely extract mimetype, uploaded, and download_count
                metadata.mimetype = $(i).find(".list").eq(0).text().trim().split("-")[1]?.trim() || 'application/octet-stream';
                metadata.uploaded = $(i).find(".list").eq(2).text().trim().split(":")[1]?.trim();
                metadata.download_count = $(i).find(".list").eq(3).text().trim().split(":")[1]?.trim();
                metadata.author = $(i).find(".list").eq(1).find("a").text().trim();
            });
            
            if (!metadata.filename) {
                 return res.status(404).json({
                    status: false,
                    message: "Gagal membaca struktur halaman. Pastikan URL adalah link download yang didukung.",
                    detail: "Tidak ditemukan elemen '.file-content'."
                });
            }

            let downloadUrl = $("#download").attr("href");
            if (!downloadUrl) {
                return res.status(500).json({
                    status: false,
                    message: "Gagal mendapatkan link proses download (ID #download tidak ditemukan)."
                });
            }

            // Step 2: GET request to the intermediate download link
            // This step is crucial to get the session key/token from the onclick attribute
            headers.Referer = downloadUrl;
            let {
                data: process
            } = await axios.get(downloadUrl, {
                headers
            }).catch(e => e.response);
            
            $ = cheerio.load(process);
            
            // Extract the key/token from the onclick attribute
            let keyAttr = $("#download").attr("onclick");
            let finalDownloadLinkBase = $("#download").attr("href");
            
            if (!keyAttr || !finalDownloadLinkBase) {
                return res.status(500).json({
                    status: false,
                    message: "Gagal mendapatkan kunci rahasia/token download."
                });
            }

            let key = keyAttr.split("'+'")[1]?.split("';")[0];
            let fullDownloadUrl = finalDownloadLinkBase + "&k=" + key;

            // Step 3: Final GET request to get the file buffer
            headers.Referer = fullDownloadUrl; 
            let {
                data: buffer,
                headers: finalHeaders
            } = await axios.get(fullDownloadUrl, {
                headers,
                responseType: "arraybuffer" 
            });
            
            if (!buffer || buffer.length === 0) {
                 return res.status(500).json({
                    status: false,
                    message: "Gagal mendapatkan konten file biner dari link akhir."
                });
            }

            // Set response headers for file download
            res.setHeader('Content-Type', finalHeaders['content-type'] || metadata.mimetype);
            res.setHeader('Content-Disposition', `attachment; filename="${metadata.filename}"`);
            res.setHeader('Content-Length', buffer.length);
            
            // Send the binary buffer
            res.send(buffer);

        } catch (error) {
            console.error("[File Downloader] ERROR:", error.message);
            
            // If headers were not sent yet (no successful download), send JSON error
            if (!res.headersSent) {
                res.status(500).json({
                    status: false,
                    error: "Kesalahan internal pada server atau kegagalan koneksi.",
                    detail: error.message
                });
            }
        }
    });
};
