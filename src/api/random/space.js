/**
 * Random Image Endpoint untuk Tipe: Space / Tata Surya
 * Endpoint: /v1/image/space
 * Sumber JSON: tatasurya.json
 */
const axios = require('axios');

const TYPE_NAME = 'space';
// Perhatikan: Sumber di GitHub menggunakan 'tatasurya.json', bukan 'space.json'
const JSON_FILENAME = 'tatasurya.json'; 
const BASE_REPO_URL = 'https://raw.githubusercontent.com/Leoo7z/Image-Source/main/image/';

async function fetchRandomImage() {
    const url = BASE_REPO_URL + JSON_FILENAME;
    
    try {
        const response = await axios.get(url);
        const data = response.data;

        if (!Array.isArray(data) || data.length === 0) {
            throw new Error(`Data JSON untuk ${TYPE_NAME} kosong atau tidak valid.`);
        }

        const randomIndex = Math.floor(Math.random() * data.length);
        const randomUrl = data[randomIndex];

        if (typeof randomUrl !== 'string' || !randomUrl.startsWith('http')) {
             throw new Error('Elemen acak yang ditemukan bukan URL gambar yang valid.');
        }

        return randomUrl;
    } catch (error) {
        throw new Error(`Gagal mengambil data dari sumber ${JSON_FILENAME}.`);
    }
}

module.exports = function (app, prefix = '/v1') {
    app.get(`${prefix}/image/${TYPE_NAME}`, async (req, res) => {
        try {
            const imageUrl = await fetchRandomImage();
            
            res.json({
                status: true,
                message: `Sukses mendapatkan gambar acak tipe ${TYPE_NAME}.`,
                type: TYPE_NAME,
                image_url: imageUrl
            });

        } catch (error) {
            console.error(`Error processing image request for ${TYPE_NAME}:`, error.message);
            res.status(500).json({ 
                status: false, 
                message: error.message 
            });
        }
    });
};
