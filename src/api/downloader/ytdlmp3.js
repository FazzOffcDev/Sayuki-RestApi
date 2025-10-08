/**
 * YouTube MP3 Downloader (Menggunakan ytdl-core/ytdl-core-muxer)
 * Mengambil metadata dan link stream audio terbaik dari video YouTube.
 */
module.exports = function (app, prefix = '') {
  const axios = require('axios');
  // Asumsi: ytdl-core adalah pustaka yang Anda gunakan (menggantikan 'yt')
  const ytdl = require('ytdl-core');
  
  // Regex untuk memvalidasi dan mengambil ID video YouTube
  const ytIdRegex = /(?:http(?:s|):\/\/|)(?:(?:www\.|)youtube(?:\-nocookie|)\.com\/(?:watch\?.*(?:|\&)v=|embed\/|v\/)|youtu\.be\/)([-_0-9A-Za-z]{11})/

  /**
   * Mendapatkan metadata dan link stream audio (opus/webm) dari video YouTube.
   * @param {string} url - URL video YouTube.
   * @returns {Promise<object>} Data hasil download.
   */
  async function ytDonlodMp3(url) {
    if (!ytIdRegex.test(url)) {
      throw new Error('URL INVALID');
    }
    
    // Mendapatkan ID Video
    const id = ytdl.getVideoID(url);
    
    // Mendapatkan info video
    const data = await ytdl.getInfo(`https://www.youtube.com/watch?v=${id}`);

    // Logika untuk menemukan format audio opus/webm seperti yang diminta
    let audioFormat = null;
    let audioUrl = null;

    // Cari format audio terbaik
    const audioFormats = ytdl.filterFormats(data.formats, 'audioonly');
    
    // Mencari format opus/webm seperti di kode asli
    for (const format of audioFormats) {
        if (format.mimeType === 'audio/webm; codecs="opus"') {
            audioFormat = format;
            break; // Ambil yang pertama ditemukan
        }
    }
    
    // Jika format opus tidak ditemukan, ambil format audio terbaik secara default
    if (!audioFormat) {
         audioFormat = audioFormats.sort((a, b) => b.audioBitrate - a.audioBitrate)[0];
         console.warn("[YT MP3] Format opus tidak ditemukan, menggunakan audio terbaik yang tersedia.");
    }
    
    if (audioFormat) {
        audioUrl = audioFormat.url;
    } else {
        throw new Error("Format audio tidak ditemukan untuk video ini.");
    }

    // Ekstraksi Metadata
    const result = {
      title: data.videoDetails.title,
      thumb: data.videoDetails.thumbnails[0].url,
      channel: data.videoDetails.ownerChannelName,
      published: data.videoDetails.publishDate,
      views: data.videoDetails.viewCount,
      url: audioUrl, // Link stream audio
      format: audioFormat.mimeType,
      quality: audioFormat.audioQuality
    };
    
    return result;
  }

  // --- ENDPOINT EXPRESS.JS ---
  app.get(`${prefix}/download/ytmp3`, async (req, res) => {
    const { url } = req.query; 

    if (!url) {
        return res.status(400).json({
            status: false,
            code: 400,
            message: "Parameter ?url= wajib diisi dengan link video YouTube."
        });
    }

    try {
      console.log(`[YT MP3 Downloader] Memproses URL: ${url}`);
      const result = await ytDonlodMp3(url);
      
      res.json({
          status: true,
          code: 200,
          message: `Link stream audio untuk "${result.title}" berhasil didapatkan.`,
          result: result
      });

    } catch (err) {
      let errorMessage = err.message || "Kesalahan tak terduga dalam memproses YouTube MP3.";
      
      console.error("[YT MP3 Downloader] ERROR:", errorMessage);
      res.status(500).json({
          status: false,
          error: errorMessage,
          message: `Gagal memproses permintaan YouTube MP3.`
      });
    }
  });
};
