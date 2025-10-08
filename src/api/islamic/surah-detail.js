const axios = require('axios');

/**
 * Endpoint Detail Surah Al-Qur'an: 
 * Mengambil semua ayat dari Surah tertentu berdasarkan ID Surah.
 */
module.exports = function (app, prefix = '') {

    // URL dasar API eksternal untuk detail Surah
    const BASE_EXTERNAL_URL = 'https://al-quran-8d642.firebaseio.com/surat/';

    /**
     * GET /quran/surah/:id
     * Contoh: /quran/surah/1
     */
    app.get(`${prefix}/quran/surah/:id`, async (req, res) => {
        const id = req.params.id;

        // 1. Validasi ID Surah (1 sampai 114)
        const surahId = parseInt(id, 10);
        if (isNaN(surahId) || surahId < 1 || surahId > 114) {
            return res.status(400).json({
                status: false,
                code: 400,
                message: "Parameter ID Surah harus berupa angka antara 1 sampai 114."
            });
        }

        // Konstruksi URL API eksternal
        const EXTERNAL_URL = `${BASE_EXTERNAL_URL}${surahId}.json?print=pretty`;

        try {
            console.log(`[QURAN - SURAH DETAIL ${surahId}] Mengambil data dari: ${EXTERNAL_URL}`);

            // 2. Melakukan request ke server eksternal
            const response = await axios.get(EXTERNAL_URL);
            
            const surahData = response.data; // Data adalah array dari ayat-ayat

            // Cek jika data kosong atau tidak valid (misalnya ID tidak ditemukan)
            if (!Array.isArray(surahData) || surahData.length === 0) {
                 return res.status(404).json({
                    status: false,
                    code: 404,
                    message: `Surah dengan ID ${surahId} tidak ditemukan atau data kosong.`
                });
            }


            // 3. Memproses dan menyusun hasil (asumsi struktur data: { ar, id, nomor, dll. })
            const cleanedVerses = surahData.map(ayat => ({
                id_surah: surahId,
                verse_number: ayat.nomor, 
                arabic: ayat.ar,
                translation_id: ayat.id
            }));

            // 4. Membuat struktur respons akhir
            const finalResponse = {
                status: true,
                code: 200,
                source: "API Al-Qur'an (Firebase)",
                id_surah: surahId,
                message: `Berhasil mengambil ${cleanedVerses.length} ayat untuk Surah ID ${surahId}.`,
                total_verses: cleanedVerses.length,
                result: cleanedVerses
            };

            // 5. Mengembalikan response data
            res.json(finalResponse);

        } catch (error) {
            console.error(`[QURAN SURAH DETAIL API ERROR ${surahId}]:`, error.message);

            const status = error.response ? error.response.status : 500;
            let errorMessage = `Kesalahan tak terduga saat mengambil detail Surah ID ${surahId}.`;

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