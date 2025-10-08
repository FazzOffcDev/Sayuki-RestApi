/**
 * DoodStream Downloader
 * Scrapes metadata and extracts the direct streaming/download link
 * from DoodStream (dood.li or d000d.com) links.
 */
module.exports = function (app, prefix = '') {
    const axios = require("axios");
    const cheerio = require("cheerio");

    // Helper function to generate random characters (simulating browser's behavior)
    function generateRandomChars(length) {
        const charSet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let result = '';
        for (let i = 0; i < length; i++) {
            result += charSet.charAt(Math.floor(Math.random() * charSet.length));
        }
        return result;
    }

    // Helper function to shorten URL (using cleanuri.com)
    async function shortlink(url) {
        return axios
            .post("https://cleanuri.com/api/v1/shorten", {
                url,
            })
            .then((a) => a.data.result_url)
            .catch(() => url); // Fallback to original URL on error
    }

    app.get(`${prefix}/download/doodstream`, async (req, res) => {
        const url = req.query.url;

        if (!url) {
            return res.status(400).json({
                status: false,
                message: "Parameter ?url= wajib diisi dengan link DoodStream/d000d.com."
            });
        }
        
        try {
            // 1. ID Extraction
            const id = url.match(/\/[de]\/(\w+)/)?.[1];
            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: "Link tidak bisa diproses. Pastikan link adalah format DoodStream yang valid (e.g., /d/ID atau /e/ID).",
                });
            }

            const proxy = "https://rv.lil-hacker.workers.dev/proxy?mirror=dood&url=";
            const headers = {
                Accept: "*/*",
                Referer: "https://d000d.com/",
                "User-Agent": "Postify/1.0.0",
                "X-Requested-With": "XMLHttpRequest",
                // Tokens are usually dynamic, but using the provided static ones for consistency
                "X-CSRF-Token": "eyJpdiI6Ik9vdlA2Zjk2NUhZNGZFY296TzBJUFE9PSIsInZhbHVlIjoiNDdjbTJCNGVSallwWE5Oc1hoZ3NDVGIxWWFMOFl6ejFjOXVUZlZ2K1B5OFZ1ZWVpajZ6aDZZOUJkUVF5NFlFbiIsIm1hYyI6IjRkMzlkNmY5NzQ0OGI4YWUzMmJmNGM0ZjE2ZWFkMzJjYzlkMjg1MjU0Y2VkZDZiZmNjMWNhZjIwYjU1MDgifQ==",
                Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6IlVzZXIiLCJpYXQiOjE1MTYyMzkwMjJ9.-H1t8kmZHtNIDaZb3_Mrjk9uqgHbsFAdXIRoV2rWr9g",
                "X-Forwarded-For": "127.0.0.1",
                "X-Real-IP": "127.0.0.1",
            };

            // Doodstream often requires a delay/wait time
            await new Promise((resolve) => setTimeout(resolve, 3000)); 

            // 2. Fetch Metadata from the file page
            const { data } = await axios.get(`https://dood.li/d/${id}`, {
                headers,
            });
            const $ = cheerio.load(data);
            
            // Check if the player iframe exists (indicator of a valid file page)
            if (!$("#os_player iframe").length) {
                return res.status(404).json({
                    success: false,
                    message: "Halaman DoodStream tidak valid atau file tidak ditemukan."
                });
            }

            let result = {
                title: $(".title-wrap h4").text().trim(),
                duration: $(".length").text().trim(),
                size: $(".size").text().trim(),
                uploadDate: $(".uploadate").text().trim(),
                download: null // Placeholder for final link
            };

            // 3. Fetch Embed Page to get the CDN token
            const { data: dp } = await axios.get(`${proxy}https://d000d.com/e/${id}`, {
                headers,
            });
            
            const cdn = dp.match(/\$.get\('([^']+)',/)?.[1];
            if (!cdn) {
                return res.status(500).json({
                    success: false,
                    message: "Gagal mendapatkan token CDN. Struktur DoodStream mungkin telah berubah."
                });
            }

            // 4. Final Token Assembly
            const chars = generateRandomChars(10); // Generate random characters
            
            // Fetch the final segment of the stream path
            const ds = await axios.get(`${proxy}https://d000d.com${cdn}`, {
                headers,
            });
            
            const cm = cdn.match(/\/([^/]+)$/)?.[1];
            if (!cm) {
                return res.status(500).json({
                    success: false,
                    message: "Gagal mendapatkan token CM. Struktur DoodStream mungkin telah berubah."
                });
            }

            // Construct the final streaming link
            result.download = `${proxy}${ds.data}${chars}?token=${cm}&expiry=${Date.now()}`;

            // 5. Check for Direct Download Link (if available, use it instead)
            const dlink = $(".download-content a").attr("href");
            if (dlink) {
                // Perform the final redirect/shortlink resolution
                const {data: finalPage} = await axios.get(`https://dood.li/d/${dlink}`);
                const dp = cheerio.load(finalPage);
                
                const finalRedirectUrl = dp("a.btn.btn-primary.d-flex").attr("href") ||
                                         dp("div.col-md-12 a.btn.btn-primary").attr("href") ||
                                         result.download; // Fallback to streaming link

                result.download = await shortlink(finalRedirectUrl);
            }
            
            res.json({
                success: true,
                ...result
            });

        } catch (error) {
            console.error("[DoodStream Downloader] ERROR:", error.message);
            res.status(500).json({
                success: false,
                error: "Kesalahan internal pada server atau kegagalan saat scraping.",
                detail: error.message
            });
        }
    });
};
