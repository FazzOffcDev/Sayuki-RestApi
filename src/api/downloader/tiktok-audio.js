/**
 * TikTok MP3 Downloader / Audio Extractor (via RapidAPI)
 */
module.exports = function (app, prefix = '') {
  const axios = require("axios");

  app.get(`${prefix}/download/tiktok/mp3`, async (req, res) => {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ success: false, message: "Parameter ?url= wajib" });
    }

    try {
      const response = await axios.get("https://tiktok-video-audio-downloader.p.rapidapi.com/audio", {
        params: { url },
        headers: {
          "x-rapidapi-host": "tiktok-video-audio-downloader.p.rapidapi.com",
          "x-rapidapi-key": '984c95eb6fmsh376437640dfb858p1194f1jsnf0df8c31888b'
        }
      });

      res.json(response.data);
    } catch (err) {
      console.error(err.response?.data || err.message);
      res.status(500).json({ success: false, message: err.message });
    }
  });
};
