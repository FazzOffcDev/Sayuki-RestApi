// src/api/download/videy.js

const axios = require('axios');
const chalk = require('chalk');

// URL API pihak ketiga
const BASE_API_URL = 'https://api.fikmydomainsz.xyz/download/videy';

/**
 * Fungsi utama untuk menangani rute /endpoint/download/videy
 * @param {object} app - Objek Express app
 * @param {string} prefix - Prefix rute (misalnya: '/endpoint')
 */
module.exports = (app, prefix) => {
    
    // Rute API: /endpoint/download/videy
    app.get(`${prefix}/download/videy`, async (req, res) => {
        const url = req.query.url; // Ambil parameter 'url'
        
        // 1. Validasi Parameter
        if (!url) {
            return res.status(400).json({
                creator: "FikXzMods",
                status: false,
                message: "Parameter 'url' wajib disertakan. Contoh: ?url=https://xn--vdey-5pa.co/v/?id=..."
            });
        }

        console.log(chalk.yellow(`[VIDEY] Menerima request untuk URL: ${url}`));

        try {
            // 2. Lakukan Request ke API Pihak Ketiga
            const externalResponse = await axios.get(BASE_API_URL, {
                params: { url: url } // Teruskan parameter 'url'
            });

            const data = externalResponse.data;

            // 3. Kirim Respon ke Pengguna
            // Respon sesuai dengan format yang Anda berikan
            if (data.status) {
                res.json({
                    creator: "FikXzMods",
                    status: true,
                    result: data.result || data // Asumsi data.result berisi payload
                });
            } else {
                 // Tangani status false dari API eksternal
                 res.status(400).json({
                    creator: "FikXzMods",
                    status: false,
                    message: data.message || "Gagal mendapatkan data dari sumber eksternal."
                });
            }

        } catch (error) {
            console.error(chalk.red(`[VIDEY ERROR] Gagal fetching data: ${error.message}`));
            
            // Tangani error jaringan atau server
            res.status(500).json({
                creator: "FikXzMods",
                status: false,
                message: "Terjadi kesalahan pada server saat memproses permintaan."
            });
        }
    });
};