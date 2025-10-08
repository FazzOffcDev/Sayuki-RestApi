const axios = require('axios');

/**
 * Endpoint Daftar Surah Al-Qur'an: 
 * Mengambil daftar 114 Surah lengkap dengan informasi dasarnya.
 */
module.exports = function (app, prefix = '') {

    // URL API eksternal Surah Al-Qur'an
    const EXTERNAL_URL = 'https://api.npoint.io/99c279bb173a6e28359c/data';

    /**
     * GET /quran/surah
     * Contoh: /quran/surah
     */
    app.get(`${prefix}/quran/surah`, async (req, res) => {
        try {
            console.log(`[QURAN - SURAH LIST] Mengambil data dari: ${EXTERNAL_URL}`);

            // 1. Melakukan request ke server eksternal
            const response = await axios.get(EXTERNAL_URL);

            const data = response.data; // Data adalah array dari 114 surah

            // 2. Memproses dan menyusun hasil
            const cleanedData = data.map(surah => ({
                number: surah.nomor,
                name: surah.nama,
                name_arabic: surah.asma,
                meaning_id: surah.arti,
                total_verse: surah.ayat,
                revelation_type: surah.type, // mekah atau madinah
                order_of_revelation: surah.urut,
                rukuk: surah.rukuk,
                description: surah.keterangan.replace(/<\/?i>/g, ''), // Menghilangkan tag <i> dari keterangan
                audio_url: surah.audio
            }));

            // 3. Membuat struktur respons akhir
            const finalResponse = {
                status: true,
                code: 200,
                source: "API Surah Al-Qur'an",
                message: "Berhasil mengambil daftar 114 Surah Al-Qur'an.",
                total_results: cleanedData.length,
                result: cleanedData
            };

            // 4. Mengembalikan response data
            res.json(finalResponse);

        } catch (error) {
            console.error("[QURAN SURAH API ERROR]:", error.message);

            const status = error.response ? error.response.status : 500;
            let errorMessage = "Kesalahan tak terduga saat mengambil daftar Surah Al-Qur'an.";

            if (error.response && error.response.data && error.response.data.message) {
                errorMessage = error.response.data.message;
            }

            // Mengembalikan response error yang terstruktur
            res.status(status).json({
                status: false,
                code: status,
                message: errorMessage
            });
        }
    });
};