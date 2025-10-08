const axios = require('axios');

/**
 * Endpoint Jadwal Sholat Bulanan: 
 * Mengambil jadwal sholat (Imsyak, Shubuh, Dzuhur, Ashr, Magrib, Isya)
 * untuk kota, tahun, dan bulan tertentu dari sumber data eksternal.
 */
module.exports = function (app, prefix = '') {

    // URL dasar API eksternal Jadwal Sholat
    const BASE_EXTERNAL_URL = 'https://raw.githubusercontent.com/lakuapik/jadwalsholatorg/master/adzan/';

    /**
     * GET /jadwal-sholat/:kota/:tahun/:bulan
     * Contoh: /jadwal-sholat/semarang/2019/12
     */
    app.get(`${prefix}/jadwal-sholat`, async (req, res) => {
        const { kota, tahun, bulan } = req.query;

        // 1. Validasi Parameter
        if (!kota || !tahun || !bulan) {
            return res.status(400).json({
                status: false,
                code: 400,
                message: "Semua parameter (:kota, :tahun, :bulan) wajib diisi."
            });
        }
        
        const year = parseInt(tahun, 10);
        const month = parseInt(bulan, 10);

        if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
             return res.status(400).json({
                status: false,
                code: 400,
                message: "Parameter :tahun atau :bulan tidak valid. Tahun harus angka (misal: 2019) dan Bulan harus antara 1-12."
            });
        }

        // Konstruksi URL API eksternal
        // Menggunakan encodeURIComponent untuk memastikan nama kota (jika mengandung spasi) diformat dengan benar
        const EXTERNAL_URL = `${BASE_EXTERNAL_URL}${encodeURIComponent(kota)}/${year}/${month}.json`;

        try {
            console.log(`[JADWAL SHOLAT] Mengambil data dari: ${EXTERNAL_URL}`);

            // 2. Melakukan request ke server eksternal
            const response = await axios.get(EXTERNAL_URL);

            const jadwalData = response.data; // Data adalah array jadwal sholat harian

            // Cek jika data kosong (meskipun request berhasil 200) atau tidak valid
            if (!Array.isArray(jadwalData) || jadwalData.length === 0) {
                 return res.status(404).json({
                    status: false,
                    code: 404,
                    message: `Jadwal sholat untuk kota '${kota}' pada ${month}/${year} tidak ditemukan. Pastikan nama kota sudah benar (e.g., 'jakarta-pusat').`
                });
            }

            // 3. Memproses dan menyusun hasil
            const cleanedData = jadwalData.map(data => ({
                tanggal: data.tanggal,
                imsyak: data.imsyak,
                shubuh: data.shubuh,
                terbit: data.terbit,
                dhuha: data.dhuha,
                dzuhur: data.dzuhur,
                ashr: data.ashr,
                magrib: data.magrib,
                isya: data.isya,
            }));

            // 4. Membuat struktur respons akhir
            const finalResponse = {
                status: true,
                code: 200,
                source: "JadwalSholat.org (Lakuapik Github)",
                city: kota,
                year: year,
                month: month,
                message: `Berhasil mengambil jadwal sholat bulanan untuk ${kota}, bulan ${month}, tahun ${year}.`,
                total_days: cleanedData.length,
                result: cleanedData
            };

            // 5. Mengembalikan response data
            res.json(finalResponse);

        } catch (error) {
            console.error(`[JADWAL SHOLAT API ERROR ${kota}/${year}/${month}]:`, error.message);

            // Menangkap error 404 jika file tidak ditemukan
            const status = error.response && error.response.status === 404 ? 404 : (error.response ? error.response.status : 500);
            let errorMessage = `Gagal mengambil jadwal sholat. Pastikan nama kota, tahun, dan bulan valid. (Status: ${status})`;

            // Mengembalikan response error yang terstruktur
            res.status(status).json({
                status: false,
                code: status,
                message: errorMessage
            });
        }
    });
};