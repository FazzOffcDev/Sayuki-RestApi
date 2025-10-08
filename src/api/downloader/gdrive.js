/**
 * Google Drive Downloader (Bypass large file preview)
 */
const axios = require("axios");

// Catatan: Jika Anda menggunakan kode ini di lingkungan Node.js lama tanpa 'fetch' global,
// Anda perlu mengganti 'fetch' dengan 'axios' atau menginstal 'node-fetch'.
// Di sini saya akan mendefinisikan GDriveDl menggunakan 'axios' untuk POST,
// dan kemudian menggunakan link download yang didapat untuk respons final.
// Karena response dari GDriveDl asli mengembalikan response object, 
// saya akan memodifikasi sedikit untuk Express agar lebih mudah dihandle.

const GDriveDl = async (id) => {
    const URL = `https://drive.google.com/uc?id=${id}&authuser=0&export=download`;

    try {
        // Melakukan POST request untuk mendapatkan download URL & metadata
        // Ini adalah langkah bypass untuk file besar yang memerlukan konfirmasi
        const res = await axios.post(URL, null, {
            headers: {
                'accept-encoding': 'gzip, deflate, br',
                'content-length': 0,
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                'origin': 'https://drive.google.com',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36',
                'x-client-data': 'CKG1yQEIkbbJAQiitskBCMS2yQEIqZ3KAQioo8oBGLeYygE=',
                'x-drive-first-party': 'DriveWebUi',
                'x-json-requested': 'true'
            }
        });

        // Respons Google Drive seringkali diawali dengan 4 karakter non-JSON (misalnya: ')]}\'')
        const rawText = res.data;
        if (!rawText || typeof rawText !== 'string' || rawText.length < 4) {
            throw new Error("Respons Google Drive tidak valid atau file tidak ditemukan.");
        }
        
        const jsonString = rawText.slice(4);
        const { fileName, sizeBytes, downloadUrl } = JSON.parse(jsonString);

        if (!downloadUrl) {
            throw new Error("Gagal mendapatkan link download. Pastikan ID file Google Drive sudah benar dan file bersifat publik.");
        }

        // Mendapatkan metadata file lebih lanjut (opsional, karena downloadUrl sudah didapat)
        // Kita hanya perlu size dan mimetype untuk output API
        const sizeMB = parseFloat((sizeBytes / (1024 * 1024)).toFixed(2));

        // Melakukan HEAD request untuk mendapatkan Content-Type tanpa mengunduh seluruh file
        const headRes = await axios.head(downloadUrl);
        const mimetype = headRes.headers['content-type'] || 'application/octet-stream';
        
        return {
            fileName,
            downloadUrl,
            size: sizeMB,
            sizeBytes,
            mimetype
        };

    } catch (error) {
        console.error("[GDrive Downloader Error]:", error.message);
        // Melemparkan error untuk ditangkap di Express route
        throw new Error(error.message.includes('JSON') ? "ID Google Drive tidak valid atau format respons berubah." : error.message);
    }
};

module.exports = function (app, prefix = '') {
    // A. Download Google Drive
    app.get(`${prefix}/download/gdrive`, async (req, res) => {
        const id = req.query.id;
        if (!id) {
            return res.status(400).json({
                status: false,
                message: "Parameter ?id= (ID file Google Drive) wajib diisi."
            });
        }

        try {
            const result = await GDriveDl(id);
            
            // Redirect ke downloadUrl jika di-request
            if (req.query.redirect === 'true') {
                 // Hanya redirect jika parameter 'redirect=true' ada
                 return res.redirect(result.downloadUrl);
            }

            res.json({
                status: true,
                message: "Sukses mendapatkan link download Google Drive.",
                data: result
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message,
                message: "Gagal memproses download Google Drive. Pastikan ID file valid dan file bersifat publik."
            });
        }
    });
};