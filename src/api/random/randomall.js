/**
 * Modul Gambar Acak (Semua dalam Satu File)
 * Menggunakan parameter rute (:type) untuk mengidentifikasi sumber gambar.
 * Endpoint: /endpoint/image/:type (misalnya: /endpoint/image/akiyama)
 */
const axios = require('axios');

// --- Peta (Mapping) Sumber Gambar ---
// Key: Nama Endpoint (misal: 'akiyama')
// Value: Nama File JSON di GitHub (misal: 'akiyama.json'). Perhatikan yang berbeda nama!
const IMAGE_SOURCES = {
    // Sumber Anime & Karakter
    'akiyama': 'akiyama.json', 'ana': 'ana.json', 'art': 'art.json', 'asuna': 'asuna.json',
    'ayuzawa': 'ayuzawa.json', 'boruto': 'boruto.json', 'bts': 'bts.json', 
    'chiho': 'chiho.json', 'chitoge': 'chitoge.json', 'cosplay': 'cosplay.json', 'cosplayloli': 'cosplayloli.json',
    'cosplaysagiri': 'cosplaysagiri.json', 'cyber': 'cyber.json', 'deidara': 'deidara.json', 'doraemon': 'doraemon.json',
    'elaina': 'elaina.json', 'emilia': 'emilia.json', 'erza': 'erza.json', 'exo': 'exo.json',
    'gamewallpaper': 'gamewallpaper.json', 'gremory': 'gremory.json', 
    'hestia': 'hestia.json', 'hinata': 'hinata.json', 'husbu': 'husbu.json', 'inori': 'inori.json',
    'islamic': 'islamic.json', 'isuzu': 'isuzu.json', 'itachi': 'itachi.json', 'itori': 'itori.json',
    'jiso': 'jiso.json', 'justina': 'justina.json', 'kaga': 'kaga.json', 'kagura': 'kagura.json',
    'kakasih': 'kakasih.json', 'kaori': 'kaori.json', 'keneki': 'keneki.json', 'kotori': 'kotori.json',
    'kurumi': 'kurumi.json', 'lisa': 'lisa.json', 'madara': 'madara.json', 'megumin': 'megumin.json',
    'mikasa': 'mikasa.json', 'mikey': 'mikey.json', 'miku': 'miku.json', 'minato': 'minato.json',
    'mountain': 'mountain.json', 'naruto': 'naruto.json', 'neko2': 'neko2.json', 'nekonime': 'nekonime.json',
    'nezuko': 'nezuko.json', 'onepiece': 'onepiece.json', 'pentol': 'pentol.json', 'pokemon': 'pokemon.json',
    'programming': 'programming.json', 'randomnime': 'randomnime.json', 'randomnime2': 'randomnime2.json',
    'rize': 'rize.json', 'rose': 'rose.json', 'sagiri': 'sagiri.json', 'sakura': 'sakura.json',
    'sasuke': 'sasuke.json', 'satanic': 'satanic.json', 'shina': 'shina.json', 'shinka': 'shinka.json',
    'shinomiya': 'shinomiya.json', 'shizuka': 'shizuka.json', 'shota': 'shota.json',
    'technology': 'technology.json', 'tejina': 'tejina.json', 'toukachan': 'toukachan.json',
    'tsunade': 'tsunade.json', 'yotsuba': 'yotsuba.json', 'yuki': 'yuki.json', 'yulibocil': 'yulibocil.json',
    'yumeko': 'yumeko.json',
    
    // --- Nama Endpoint yang berbeda dengan Nama File JSON di GitHub ---
    'cartoon': 'kartun.json',       // Endpoint 'cartoon' -> File 'kartun.json'
    'hacker': 'hekel.json',         // Endpoint 'hacker' -> File 'hekel.json'
    'jennie': 'jeni.json',          // Endpoint 'jennie' -> File 'jeni.json'
    'shortquote': 'katakata.json',  // Endpoint 'shortquote' -> File 'katakata.json'
    'space': 'tatasurya.json'       // Endpoint 'space' -> File 'tatasurya.json'
};

const BASE_REPO_URL = 'https://raw.githubusercontent.com/Leoo7z/Image-Source/main/image/';

/**
 * Fungsi inti untuk mengambil JSON, memilih URL acak, dan mengembalikannya.
 */
async function fetchRandomImage(filename, type) {
    const url = BASE_REPO_URL + filename;
    
    try {
        const response = await axios.get(url, { timeout: 10000 }); // Tambahkan timeout
        const data = response.data;

        if (!Array.isArray(data) || data.length === 0) {
            throw new Error(`Data JSON untuk ${type} kosong atau tidak valid.`);
        }

        const randomIndex = Math.floor(Math.random() * data.length);
        const randomUrl = data[randomIndex];

        if (typeof randomUrl !== 'string' || !randomUrl.startsWith('http')) {
             throw new Error('Elemen acak yang ditemukan bukan URL gambar yang valid.');
        }

        return randomUrl;
    } catch (error) {
        // Logging detail error (misal: timeout, 404)
        console.error(`Error fetching image for ${type} (${filename}):`, error.message);
        throw new Error(`Gagal mengambil data dari sumber ${filename}. Pastikan sumber valid.`);
    }
}


module.exports = function (app, prefix = '/endpoint') {
    
    // Endpoint Tunggal: /endpoint/image/:type
    // Contoh: /endpoint/image/naruto atau /endpoint/image/jennie
    app.get(`${prefix}/image/:type`, async (req, res) => {
        const type = req.params.type ? req.params.type.toLowerCase() : '';
        
        const filename = IMAGE_SOURCES[type];
        
        if (!filename) {
            return res.status(404).json({ 
                status: false, 
                message: `Tipe gambar '${type}' tidak ditemukan.` 
            });
        }

        try {
            const imageUrl = await fetchRandomImage(filename, type);
            
            res.json({
                status: true,
                message: `Sukses mendapatkan gambar acak tipe ${type}.`,
                type: type,
                image_url: imageUrl
            });

        } catch (error) {
            res.status(500).json({ 
                status: false, 
                message: error.message 
            });
        }
    });
};