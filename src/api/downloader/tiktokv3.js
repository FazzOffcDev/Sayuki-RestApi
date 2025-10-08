/**
 * TikTok Downloader (ttsave.app Scraper)
 * Menyediakan fungsi untuk mengunduh video, audio, dan slide image dari TikTok.
 */
module.exports = function (app, prefix = '') {
    const axios = require('axios');
    const cheerio = require('cheerio');

    const headers = {
        "authority": "ttsave.app",
        "accept": "application/json, text/plain, */*",
        "origin": "https://ttsave.app",
        "user-agent": "Postify/1.0.0", // User-Agent yang konsisten
    };

    class TtsaveKrep {
        
        /**
         * Melakukan request POST ke endpoint download ttsave.app
         * @param {string} url - URL TikTok yang akan diunduh.
         * @param {string} referer - Referer URL yang sesuai (penting untuk API ttsave).
         */
        submit = async function(url, referer) {
            const headerx = {
                ...headers,
                referer: referer // Menggunakan referer spesifik
            };
            const data = {
                "query": url,
                "language_id": "1"
            };
            // Request POST
            return axios.post('https://ttsave.app/download', data, {
                headers: headerx
            });
        }

        /**
         * Parsing hasil HTML dari ttsave.app
         */
        parse = function($) {
            // Metadata Video/Post
            const uniqueId = $('#unique-id').val();
            const nickname = $('h2.font-extrabold').text().trim();
            const profilePic = $('img.rounded-full').attr('src');
            const username = $('a.font-extrabold.text-blue-400').text().trim();
            const description = $('p.text-gray-600').text().trim();
            
            // Link Download
            const dlink = {
                nowm: $('a.w-full.text-white.font-bold').first().attr('href'),
                wm: $('a.w-full.text-white.font-bold').eq(1).attr('href'),
                audio: $('a[type="audio"]').attr('href'),
                profilePic: $('a[type="profile"]').attr('href'),
                cover: $('a[type="cover"]').attr('href')
            };

            // Statistik (memerlukan selector SVG yang spesifik)
            const stats = { plays: 'N/A', likes: 'N/A', comments: 'N/A', shares: 'N/A' };
            
            // Logika parsing statistik berdasarkan struktur elemen di ttsave.app
            // Karena menggunakan path SVG adalah teknik scraping yang rapuh, 
            // kita akan menggunakan struktur umum yang lebih stabil jika ada.
            $('.flex.flex-row.items-center.justify-center').each((index, element) => {
                const $element = $(element);
                const value = $element.find('span.text-gray-500').text().trim();
                
                // Mendeteksi ikon (tidak menggunakan path SVG karena terlalu rapuh)
                // Kita akan asumsikan urutan standar (Plays, Likes, Comments, Shares)
                if (index === 0) stats.plays = value || '0';
                if (index === 1) stats.likes = value || '0';
                if (index === 2) stats.comments = value || '0';
                if (index === 3) stats.shares = value || '0';
            });


            const songTitle = $('.flex.flex-row.items-center.justify-center.gap-1.mt-5')
                .find('span.text-gray-500')
                .text()
                .trim();

            // Link Slide Image (jika ada)
            const slides = $('a[type="slide"]').map((i, el) => ({
                number: i + 1,
                url: $(el).attr('href')
            })).get();

            return {
                uniqueId,
                nickname,
                profilePic,
                username,
                description,
                dlink,
                stats,
                songTitle,
                slides
            };
        }

        video = async function(link) {
            const response = await this.submit(link, 'https://ttsave.app/en');
            const $ = cheerio.load(response.data);
            const result = this.parse($);

            if (!result.dlink.nowm && result.slides.length === 0) {
                 throw new Error('Gagal mendapatkan link video. Mungkin ini adalah slide image atau video telah dihapus.');
            }
            
            return {
                status: true,
                type: result.slides.length > 0 ? 'slide' : 'video',
                ...result,
                download: {
                    nowm: result.dlink.nowm,
                    wm: result.dlink.wm,
                    cover: result.dlink.cover
                },
                dlink: undefined // Hapus properti internal dlink
            };
        }
        
        // Fungsi mp3 dan slide tidak lagi diperlukan karena fungsi video() sudah cukup
        // Ttsave akan mendeteksi tipe konten secara otomatis
    };

    const ttsavekrepInstance = new TtsaveKrep();

    // --- ENDPOINT EXPRESS.JS ---
    app.get(`${prefix}/download/tiktokv3`, async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                status: false,
                code: 400,
                message: "Parameter ?url= wajib diisi dengan link video TikTok."
            });
        }

        try {
            console.log(`[Ttsave Downloader] Memproses URL: ${url}`);
            
            // Hanya perlu memanggil fungsi utama video()
            const result = await ttsavekrepInstance.video(url);
            
            // Cek apakah konten yang dikembalikan adalah slide atau video biasa
            if (result.type === 'slide') {
                result.message = `Berhasil mendapatkan ${result.slides.length} slide image.`;
            } else {
                 result.message = "Berhasil mendapatkan link video dan audio TikTok.";
            }

            res.json(result);

        } catch (err) {
            let errorMessage = err.message || "Gagal memproses TikTok Downloader (ttsave). Coba pastikan link valid.";

            console.error("[Ttsave Downloader] ERROR:", err.message);
            res.status(500).json({
                status: false,
                error: errorMessage,
                message: `Gagal memproses permintaan Ttsave Downloader: ${errorMessage}`
            });
        }
    });
};
