/**
 * Otakudesu Scraper (Search, Latest Updates, Detail, and Episode Download Links)
 */
const axios = require('axios');
const cheerio = require('cheerio');

module.exports = function (app, prefix = '') {
    const BASE_URL = 'https://otakudesu.cloud';

    /**
     * Helper: Mendapatkan semua link episode dari halaman detail anime.
     * Digunakan dalam getAnimeDetails.
     * @param {string} link URL halaman detail anime.
     * @returns {Promise<Array<string>>} Array berisi URL setiap episode.
     */
    const opsidownloadanime = async (link) => {
        try {
            const response = await axios.get(link);
            const $ = cheerio.load(response.data);
            const episodeLinks = [];

            // Selector untuk daftar episode di halaman detail
            $('.episodelist ul li span a').each((index, element) => {
                episodeLinks.push($(element).attr('href'));
            });

            return episodeLinks.reverse(); // Mengubah urutan agar episode terbaru (teratas di web) ada di akhir array
        } catch (error) {
            console.error('Error fetching episode list:', error.message);
            return [];
        }
    };


    // 1. Fungsi Pencarian Anime
    const searchAnime = async (search) => {
        const url = `${BASE_URL}/?s=${encodeURIComponent(search)}&post_type=anime`;
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        const results = [];

        $('ul.chivsrc li').each((index, element) => {
            const title = $(element).find('h2 a').text().trim();
            const link = $(element).find('h2 a').attr('href');
            const image = $(element).find('img').attr('src');
            const genres = [];

            $(element).find('.set a').each((i, el) => {
                genres.push($(el).text().trim());
            });

            // Menggunakan fungsi .filter untuk menemukan elemen yang mengandung teks spesifik
            const status = $(element).find('.set:contains("Status")').text().replace('Status :', '').trim();
            const rating = $(element).find('.set:contains("Rating")').text().replace('Rating :', '').trim();

            if (link) {
                results.push({
                    title,
                    link,
                    image,
                    genres,
                    status,
                    rating
                });
            }
        });

        return results;
    };


    // 2. Fungsi Anime Terbaru (Updates)
    const otakupdate = async () => {
        const url = `${BASE_URL}/ongoing-anime/`;
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        const updates = [];

        // Selector untuk ongoing anime list
        $('ul.chbox li .detpost').each((index, element) => {
            const elJq = $(element);
            const episode = elJq.find('.epz').text().trim();
            const day = elJq.find('.epztipe').text().trim();
            const date = elJq.find('.newnime').text().trim();
            const link = elJq.find('.thumb a').attr('href');
            const title = elJq.find('.thumbz h2.jdlflm').text().trim();

            if (link) {
                updates.push({
                    title,
                    episode,
                    day,
                    date,
                    link
                });
            }
        });

        return updates;
    };


    // 3. Fungsi Detail Anime
    const getAnimeDetails = async (link) => {
        const response = await axios.get(link);
        const $ = cheerio.load(response.data);

        // Ambil data dari elemen infozingle
        const infozingleSpans = $('div.infozingle span');

        const getValue = (label) => infozingleSpans.filter((index, element) => $(element).find('b').text().includes(label)).text().trim().split(': ')[1] || 'N/A';

        const thumbnail = $('div.fotoanime img.attachment-post-thumbnail').attr('src');

        const detailData = {
            judul: getValue('Judul'),
            japanese: getValue('Japanese'),
            skor: getValue('Skor'),
            produser: getValue('Produser'),
            tipe: getValue('Tipe'),
            status: getValue('Status'),
            studio: getValue('Studio'),
            rilis: getValue('Tanggal Rilis'),
            episode: getValue('Total Episode'),
            duration: getValue('Durasi'),
            genre: infozingleSpans.filter((index, element) => $(element).find('b').text().includes('Genre')).find('a').map((i, el) => $(el).text().trim()).get().join(', '),
            thumbnail: thumbnail || 'N/A'
        };

        // Ambil Sinopsis
        let sinopsis = '';
        $('.sinopc p').each((index, element) => {
            sinopsis += $(element).text().trim() + '\n';
        });

        // Ambil daftar episode
        const downanime = await opsidownloadanime(link);

        return {
            metadata: detailData,
            episode_list: downanime,
            sinopsis: sinopsis.trim()
        };
    };

    // 4. Fungsi Link Download Episode
    const getEpisodeLinks = async (link) => {
        const response = await axios.get(link);
        const $ = cheerio.load(response.data);
        const downloadData = {};

        // Scraping metadata episode
        const metadata = {
            title: $('h1.post-title').text().trim(),
            anime_title: $('.infozingle a').first().text().trim(),
            release_date: $('.infozingle b:contains("Tanggal Rilis:")').parent().text().replace('Tanggal Rilis:', '').trim(),
            download_area_title: $('#download').find('.batchlink').text().trim() // Untuk Batch Link (jika ada)
        };


        // Bagian Download Link (berdasarkan kualitas)
        $('#download ul li').each((_, element) => {
            const quality = $(element).find('strong').text().trim();
            const size = $(element).find('i').text().trim();
            const links = [];

            $(element).find('a').each((_, linkEl) => {
                links.push({
                    server: $(linkEl).text().trim(),
                    url: $(linkEl).attr('href'),
                });
            });
            
            if (quality) {
                 downloadData[quality] = {
                    size: size || 'N/A',
                    links: links
                };
            }
        });
        
        if (Object.keys(downloadData).length === 0) {
            // Coba ambil dari batch jika ini halaman batch link
            $('.batchlink').each((_, el) => {
                 const batchTitle = $(el).find('p').text().trim();
                 $(el).find('ul li').each((_, li) => {
                    const quality = $(li).find('strong').text().trim();
                    const size = $(li).find('i').text().trim();
                    const links = [];

                    $(li).find('a').each((_, linkEl) => {
                        links.push({
                            server: $(linkEl).text().trim(),
                            url: $(linkEl).attr('href'),
                        });
                    });
                    
                    if (quality) {
                        downloadData[quality] = {
                            size: size || 'N/A',
                            links: links
                        };
                    }
                 });
            });
        }


        return {
            metadata,
            download: downloadData
        };
    };


    // ================== EXPRESS ROUTES ==================

    // A. Endpoint Pencarian
    app.get(`${prefix}/search/otakudesu`, async (req, res) => {
        const q = req.query.q;
        if (!q) {
            return res.status(400).json({
                status: false,
                message: "Parameter ?q= (query/kata kunci) wajib diisi."
            });
        }

        try {
            const results = await searchAnime(q);
            if (results.length === 0) {
                 return res.json({
                    status: true,
                    message: "Pencarian berhasil, namun tidak ada hasil ditemukan.",
                    data: []
                });
            }
            res.json({
                status: true,
                message: `Sukses mencari anime di Otakudesu untuk kata kunci: ${q}`,
                data: results
            });
        } catch (error) {
            console.error("[Otakudesu Search] ERROR:", error.message);
            res.status(500).json({
                status: false,
                error: error.message,
                message: "Gagal memproses pencarian."
            });
        }
    });

    // B. Endpoint Anime Terbaru (Updates)
    app.get(`${prefix}/scrape/otakudesu/updates`, async (req, res) => {
        try {
            const results = await otakupdate();
            res.json({
                status: true,
                message: "Sukses mengambil update anime terbaru (ongoing) dari Otakudesu.",
                data: results
            });
        } catch (error) {
            console.error("[Otakudesu Updates] ERROR:", error.message);
            res.status(500).json({
                status: false,
                error: error.message,
                message: "Gagal mengambil data update terbaru."
            });
        }
    });

    // C. Endpoint Detail Anime
    app.get(`${prefix}/info/otakudesu/detail`, async (req, res) => {
        const url = req.query.url;
        if (!url || !url.includes(BASE_URL.split('//')[1])) {
            return res.status(400).json({
                status: false,
                message: `Parameter ?url= wajib diisi dengan link detail anime dari Otakudesu (e.g., ${BASE_URL}/anime/...).`
            });
        }

        try {
            const result = await getAnimeDetails(url);
            res.json({
                status: true,
                message: "Sukses mengambil detail anime, sinopsis, dan daftar episode.",
                data: result
            });
        } catch (error) {
            console.error("[Otakudesu Detail] ERROR:", error.message);
            res.status(500).json({
                status: false,
                error: error.message,
                message: "Gagal mengambil detail anime."
            });
        }
    });

    // D. Endpoint Download Episode
    app.get(`${prefix}/download/otakudesu/episode`, async (req, res) => {
        const url = req.query.url;
        if (!url || !url.includes(BASE_URL.split('//')[1])) {
            return res.status(400).json({
                status: false,
                message: `Parameter ?url= wajib diisi dengan link episode Otakudesu (e.g., ${BASE_URL}/episode/...).`
            });
        }

        try {
            const result = await getEpisodeLinks(url);
            res.json({
                status: true,
                message: "Sukses mengambil link download episode (termasuk batch link jika tersedia).",
                data: result
            });
        } catch (error) {
            console.error("[Otakudesu Episode] ERROR:", error.message);
            res.status(500).json({
                status: false,
                error: error.message,
                message: "Gagal mengambil link download episode."
            });
        }
    });
};
