/**
 * Jadwal Acara TV Scraper (dari Dokitv.com)
 * WARNING: Scraper ini sangat bergantung pada struktur HTML situs sumber.
 */
const axios = require("axios");
const cheerio = require("cheerio");

// URL target untuk scraping jadwal acara TV
const JADWAL_TV_URL = 'http://www.dokitv.com/jadwal-acara-tv';

const jadwaltv = async () => {
    try {
        const { data } = await axios.get(JADWAL_TV_URL, {
            // Menambahkan User-Agent agar tidak dianggap bot
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        const $ = cheerio.load(data);
        const hasil = [];

        // Selector utama: mencari semua baris (tr) di dalam tabel jadwal TV
        $('#tabeljadwaltv > tbody > tr ').each(function(a, b) {
            
            // Mengekstrak data dari kolom yang berbeda
            const jam = $(b).find('> td.jfx').text().trim();
            const acara = $(b).find('> td:nth-child(2)').text().trim();
            const channelElement = $(b).find('> td:nth-child(1) > a');
            const channel = channelElement.text().trim();
            const source = channelElement.attr('href');

            // Memastikan data valid (jam dan acara tidak kosong)
            if (jam && acara && channel) {
                const result = {
                    status: 200,
                    author: "Automated Scraper", // Mengganti author statis
                    acara: acara,
                    channel: channel,
                    jam: jam,
                    source: source || null // source bisa kosong
                };
                hasil.push(result);
            }
        });

        if (hasil.length === 0) {
            throw new Error("Gagal mengambil data jadwal TV. Struktur HTML mungkin telah berubah.");
        }

        return hasil;

    } catch (error) {
        console.error("[Jadwal TV Scraper Error]:", error.message);
        throw new Error(`Gagal mengambil data jadwal TV: ${error.message}`);
    }
};

module.exports = function (app, prefix = '') {
    // A. Jadwal Acara TV
    app.get(`${prefix}/info/jadwal/tv`, async (req, res) => {
        try {
            const results = await jadwaltv();
            res.json({
                status: true,
                message: "Sukses mengambil jadwal acara TV hari ini.",
                data: results
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message,
                message: "Gagal memproses jadwal TV. Sumber mungkin tidak tersedia atau struktur web berubah."
            });
        }
    });
};