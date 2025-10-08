/**
 * Modul Doa Harian
 * Mengambil data dari API: https://doa-doa-api-ahmadramadhan.fly.dev/api
 * Endpoint: /endpoint/islamic/doa?q=[nama doa]
 */
const axios = require('axios');

const DOA_API_URL = 'https://doa-doa-api-ahmadramadhan.fly.dev/api';

/**
 * Mengambil semua data doa dari API eksternal.
 * @returns {Promise<Array<Object>>}
 */
async function fetchAllDoa() {
    try {
        const response = await axios.get(DOA_API_URL);
        const data = response.data;
        if (!Array.isArray(data)) {
            throw new Error('Format data API tidak sesuai (bukan array).');
        }
        return data;
    } catch (error) {
        console.error("Error fetching Doa API:", error.message);
        throw new Error('Gagal berkomunikasi dengan penyedia API Doa.');
    }
}

module.exports = function (app, prefix = '/endpoint') {
    
    // Endpoint: Doa Harian
    // PATH: /endpoint/islamic/doa?q=doa sebelum tidur
    app.get(`${prefix}/islamic/doa`, async (req, res) => {
        const query = req.query.q;
        
        try {
            const daftarDoa = await fetchAllDoa();
            
            if (!query) {
                // Kasus 1: Tanpa query (Menampilkan daftar semua doa)
                
                // Batasi jumlah daftar yang ditampilkan (misal 50) agar respons tidak terlalu besar
                const displayCount = 50;
                const limitedDoa = daftarDoa.slice(0, displayCount);
                
                let listDoa = '*DAFTAR DOA*\n\n' + limitedDoa.map((item) => `- ${item.doa}`).join('\n');
                
                if (daftarDoa.length > displayCount) {
                    listDoa += `\n... dan ${daftarDoa.length - displayCount} doa lainnya.`;
                }
                
                listDoa += '\n\nGunakan parameter `?q=` untuk mencari doa spesifik, contoh: `?q=doa sebelum tidur`';

                res.json({
                    status: true,
                    message: "Sukses menampilkan daftar doa.",
                    count: daftarDoa.length,
                    note: "Tambahkan parameter '?q=[nama doa]' untuk detail.",
                    info: listDoa
                });
                
            } else {
                // Kasus 2: Dengan query (Mencari dan menampilkan detail doa)
                const text = query.toLowerCase().trim();
                
                const hasil = daftarDoa.find((item) => 
                    item.doa.toLowerCase().includes(text) || 
                    (item.artinya && item.artinya.toLowerCase().includes(text))
                );

                if (hasil) {
                    let tks = `*${hasil.doa ? hasil.doa.toUpperCase() : 'DOA TIDAK BERNAMA'}*\n\n` +
                        `Ayat: ${hasil.ayat || 'N/A'}\n\n` +
                        `Latin: ${hasil.latin || 'N/A'}\n\n` +
                        `Artinya: ${hasil.artinya || 'N/A'}`;
                        
                    res.json({
                        status: true,
                        message: `Sukses menemukan doa: ${hasil.doa}`,
                        data: {
                            doa: hasil.doa,
                            ayat: hasil.ayat,
                            latin: hasil.latin,
                            artinya: hasil.artinya,
                            full_text: tks
                        }
                    });
                } else {
                    res.status(404).json({
                        status: false,
                        message: `Doa yang dicari dengan kata kunci '${query}' tidak ditemukan.`
                    });
                }
            }
            
        } catch (error) {
            console.error("Error processing Doa request:", error.message);
            res.status(500).json({ 
                status: false, 
                message: error.message 
            });
        }
    });
};