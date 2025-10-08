/**
 * Jadwal Bola TV Scraper (dari Bola.net)
 */
const axios = require("axios");
const cheerio = require("cheerio");

// URL target untuk scraping jadwal televisi
const JADWAL_BOLA_URL = 'https://m.bola.net/jadwal_televisi/';

const jadwalbola = async () => {
    try {
        const { data } = await axios.get(JADWAL_BOLA_URL);
        const $ = cheerio.load(data);
        const hasil = [];

        // Menggunakan selector yang lebih spesifik jika memungkinkan, atau mengikuti struktur Anda
        // Selector utama: #main_mid_headline_sub_topic biasanya membungkus daftar item
        $('#main_mid_headline_sub_topic').each(function(index, element) {
            
            // Mengambil teks yang mungkin memiliki banyak spasi dan newline, lalu membersihkannya.
            const rawTanggal = $(element).find(' > div.main_mid_headline_topic_grouped_time_list').text();
            
            // Membersihkan tanggal: menghapus spasi berlebihan dan newline
            let tanggal = rawTanggal.replace(/\s+/g, ' ').trim();
            
            // Mendapatkan data utama
            const judul = $(element).find(' > div.main_mid_headline_topic > div > a').text().trim();
            const jam = $(element).find(' > div.main_mid_headline_topic > span').text().trim();
            const url = $(element).find(' > div.main_mid_headline_topic > div > a').attr('href');
            const thumb = $(element).find(' > div.main_mid_headline_topic > img').attr('src');
            
            // Memfilter hasil yang kosong (hanya mengambil item yang memiliki judul)
            if (judul) {
                const result = {
                    status: 200,
                    author: "Automated Scraper", // Mengganti author statis
                    jadwal: judul,
                    tanggal: tanggal,
                    jam: jam,
                    url: url ? 'https://m.bola.net' + url : null, // Memastikan URL lengkap
                    thumb: thumb,
                };
                hasil.push(result);
            }
        });
        
        if (hasil.length === 0) {
            throw new Error("Gagal mengambil data jadwal. Struktur HTML mungkin telah berubah atau tidak ada jadwal yang tersedia.");
        }

        return hasil;
        
    } catch (error) {
        console.error("[Jadwal Bola Scraper Error]:", error.message);
        throw new Error(`Gagal mengambil data jadwal bola: ${error.message}`);
    }
};

module.exports = function (app, prefix = '') {
    // A. Jadwal Bola TV
    app.get(`${prefix}/info/jadwal/bola`, async (req, res) => {
        try {
            const results = await jadwalbola();
            res.json({
                status: true,
                message: "Sukses mengambil jadwal pertandingan bola di TV.",
                data: results
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message,
                message: "Gagal memproses jadwal bola. Sumber mungkin tidak tersedia atau struktur web berubah."
            });
        }
    });
};