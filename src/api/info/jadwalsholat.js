/**
 * Jadwal Sholat Harian Scraper (dari Umrotix.com)
 * Membutuhkan nama kota (contoh: jakarta, bandung) sebagai query.
 */
const axios = require("axios");
const cheerio = require("cheerio");

const JADWAL_SHOLAT_URL = 'https://umrotix.com/jadwal-sholat/';

const jadwalsholat = async (query) => {
    // Memastikan query (nama kota) di-encode untuk URL
    const encodedQuery = encodeURIComponent(query.toLowerCase());
    const fullUrl = `${JADWAL_SHOLAT_URL}${encodedQuery}`;

    try {
        const { data } = await axios.get(fullUrl, {
            // Menambahkan User-Agent agar tidak dianggap bot
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        const $ = cheerio.load(data);
        let result = null;

        // Selector utama: Mencoba menargetkan container jadwal sholat
        // Struktur situs ini agak spesifik, kita ikuti selector yang Anda berikan
        $('body > div > div.main-wrapper.scrollspy-action > div:nth-child(3) ').each(function(a, b) {   
            // Mengambil tanggal (teks dari div:nth-child(2))
            const tanggal = $(b).find('> div:nth-child(2)').text().trim();
            
            // Memeriksa apakah tanggal valid. Jika tidak, kota mungkin salah.
            if (!tanggal || tanggal.includes('Jadwal Sholat')) {
                return; // Lanjut ke iterasi berikutnya atau keluar dari loop
            }
            
            // Ekstraksi waktu sholat
            result = {
                status: 200,
                author: "FazzCodex", // Mengganti author statis
                lokasi: query.charAt(0).toUpperCase() + query.slice(1), // Kapitalisasi query
                tanggal: tanggal,
                imsyak: $(b).find('> div.panel.daily > div > div > div > div > div:nth-child(1) > p:nth-child(2)').text().trim(),
                subuh: $(b).find('> div.panel.daily > div > div > div > div > div:nth-child(2) > p:nth-child(2)').text().trim(),
                dzuhur: $(b).find('> div.panel.daily > div > div > div > div > div:nth-child(3) > p:nth-child(2)').text().trim(),
                ashar: $(b).find('> div.panel.daily > div > div > div > div > div:nth-child(4) > p:nth-child(2)').text().trim(),
                maghrib: $(b).find('> div.panel.daily > div > div > div > div > div:nth-child(5) > p:nth-child(2)').text().trim(),
                isya: $(b).find('> div.panel.daily > div > div > div > div > div:nth-child(6) > p:nth-child(2)').text().trim()
            };
        });

        if (!result || !result.subuh) {
            // Jika hasilnya null atau data sholat tidak ditemukan
            throw new Error(`Data jadwal sholat untuk kota '${query}' tidak ditemukan atau struktur web berubah.`);
        }

        return result;

    } catch (error) {
        console.error("[Jadwal Sholat Scraper Error]:", error.message);
        throw new Error(`Gagal mengambil data jadwal sholat: ${error.message}`);
    }
};

module.exports = function (app, prefix = '') {
    // A. Jadwal Sholat Harian
    app.get(`${prefix}/info/jadwal/sholat`, async (req, res) => {
        const query = req.query.query;
        if (!query) {
            return res.status(400).json({
                status: false,
                message: "Parameter ?query= (Nama kota/daerah) wajib diisi. Contoh: ?query=jakarta"
            });
        }

        try {
            const results = await jadwalsholat(query);
            res.json({
                status: true,
                message: `Sukses mengambil jadwal sholat untuk ${results.lokasi}.`,
                data: results
            });
        } catch (error) {
            const statusCode = error.message.includes('tidak ditemukan') ? 404 : 500;
            res.status(statusCode).json({
                status: false,
                error: error.message,
                message: "Gagal memproses jadwal sholat. Pastikan nama kota benar atau struktur web berubah."
            });
        }
    });
};
