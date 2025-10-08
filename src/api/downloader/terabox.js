/**
 * Terabox Downloader
 * Menggunakan API proxy pihak ketiga untuk mendapatkan link download langsung 
 * dari Terabox/Baidu Netdisk share link.
 */
module.exports = function (app, prefix = '') {
    // Menggunakan fetch global yang tersedia di lingkungan Node.js modern
    
    const TeraboxHandler = {
        /**
         * Mengambil metadata file dan token yang diperlukan dari URL share Terabox.
         * @param {string} inputUrl 
         */
        getInfo: async (inputUrl) => {
            const shortUrl = inputUrl.split("/").pop();
            const url = `https://terabox.hnn.workers.dev/api/get-info?shorturl=${shortUrl}&pwd=`;
            const headers = {
                "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
                Referer: "https://terabox.hnn.workers.dev/",
            };
            
            const response = await fetch(url, { headers: headers });
            
            if (!response.ok) {
                throw new Error(`Gagal mengambil informasi file: ${response.status} ${response.statusText}`);
            }
            return await response.json();
        },

        /**
         * Mengambil link download langsung menggunakan token dan fs_id.
         */
        getDownloadLink: async (fsId, shareid, uk, sign, timestamp) => {
            const url = "https://terabox.hnn.workers.dev/api/get-download";
            const headers = {
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
                Referer: "https://terabox.hnn.workers.dev/",
            };
            const data = { shareid, uk, sign, timestamp, fs_id: fsId };
            
            const response = await fetch(url, {
                method: "POST",
                headers: headers,
                body: JSON.stringify(data),
            });
            
            if (!response.ok) {
                throw new Error(`Gagal mengambil link download: ${response.status} ${response.statusText}`);
            }
            return await response.json();
        },

        /**
         * Mengkoordinasikan proses pengambilan info dan download.
         */
        download: async (inputUrl) => {
            const { list, shareid, uk, sign, timestamp } = await TeraboxHandler.getInfo(inputUrl);
            
            if (!list || list.length === 0) {
                throw new Error(`File tidak ditemukan atau link sudah kadaluarsa.`);
            }
            
            let array = [];
            for (const file of list) {
                const fsId = file.fs_id;
                
                // Get the final download link for each file
                const { downloadLink } = await TeraboxHandler.getDownloadLink(
                    fsId,
                    shareid,
                    uk,
                    sign,
                    timestamp,
                );
                
                array.push({
                    filename: file.filename,
                    size: file.size,
                    download: downloadLink,
                });
            }
            return array;
        }
    };
    
    app.get(`${prefix}/download/terabox`, async (req, res) => {
        const url = req.query.url;

        if (!url) {
            return res.status(400).json({
                status: false,
                message: "Parameter ?url= wajib diisi dengan link Terabox/Baidu (share link)."
            });
        }
        
        if (!/(terabox|baidu)\.com/i.test(url)) {
            return res.status(400).json({
                status: false,
                message: "URL yang diberikan tidak terlihat seperti link Terabox atau Baidu share link."
            });
        }

        try {
            const downloadArray = await TeraboxHandler.download(url);
            
            res.json({
                status: true,
                message: "Sukses mengambil link download Terabox.",
                data: downloadArray
            });

        } catch (error) {
            console.error("[Terabox Downloader] ERROR:", error.message);
            res.status(500).json({
                status: false,
                error: "Kesalahan saat memproses permintaan Terabox.",
                detail: error.message
            });
        }
    });
};
