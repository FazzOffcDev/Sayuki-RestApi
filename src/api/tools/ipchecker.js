const axios = require('axios');

/**
 * Endpoint IP Checker: Mendapatkan detail geolokasi berdasarkan alamat IP.
 */
module.exports = function (app, prefix = '') {

    // URL dasar API ipapi.co
    const BASE_EXTERNAL_URL = 'https://ipapi.co/';

    /**
     * GET /ipchecker
     * Contoh: /ipchecker?ip=8.8.8.8
     */
    app.get(`${prefix}/ipchecker`, async (req, res) => {
        const ipAddress = req.query.ip;

        // 1. Validasi Parameter
        if (!ipAddress) {
            return res.status(400).json({
                status: false,
                code: 400,
                message: "Parameter 'ip' (alamat IP) wajib diisi. Contoh: ?ip=8.8.8.8"
            });
        }

        // Konstruksi URL API eksternal
        const EXTERNAL_URL = `${BASE_EXTERNAL_URL}${encodeURIComponent(ipAddress)}/json/`;

        try {
            console.log(`[IP Checker] Mengambil data dari: ${EXTERNAL_URL}`);

            // 2. Melakukan request ke server eksternal
            const response = await axios.get(EXTERNAL_URL);

            const ipData = response.data; 

            // Cek jika API mengembalikan objek error
            if (ipData.error) {
                 return res.status(404).json({
                    status: false,
                    code: 404,
                    message: ipData.reason || `Alamat IP '${ipAddress}' tidak valid atau tidak ditemukan datanya.`
                });
            }

            // 3. Memproses dan menyusun hasil (memilih field yang relevan)
            const cleanedData = {
                ip: ipData.ip,
                version: ipData.version,
                city: ipData.city,
                region: ipData.region,
                country_name: ipData.country_name,
                country_code: ipData.country_code,
                continent_code: ipData.continent_code,
                latitude: ipData.latitude,
                longitude: ipData.longitude,
                timezone: ipData.timezone,
                organization: ipData.org,
                asn: ipData.asn
            };

            // 4. Membuat struktur respons akhir
            const finalResponse = {
                status: true,
                code: 200,
                source: "ipapi.co",
                message: `Geolokasi berhasil ditemukan untuk IP: ${ipAddress}`,
                result: cleanedData
            };

            // 5. Mengembalikan response data
            res.json(finalResponse);

        } catch (error) {
            console.error(`[IP CHECKER API ERROR ${ipAddress}]:`, error.message);

            const status = error.response ? error.response.status : 500;
            let errorMessage = "Kesalahan tak terduga saat melakukan pengecekan IP. Pastikan format IP sudah benar.";

            // Mengembalikan response error yang terstruktur
            res.status(status).json({
                status: false,
                code: status,
                message: errorMessage
            });
        }
    });
};