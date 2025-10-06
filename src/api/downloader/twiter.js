/**
* Twitter/X Downloader
* Base : https://x2twitter.com
*/
module.exports = function (app, prefix = '') {
  const axios = require("axios");
  const cheerio = require("cheerio");
  const qs = require("querystring");

  async function x2twitter(url) {
    try {
      const verifyRes = await axios.post(
        "https://x2twitter.com/api/userverify",
        qs.stringify({ url }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" } }
      );

      const token = verifyRes.data?.token;
      if (!token) throw new Error("Gagal mendapatkan token!");

      const searchRes = await axios.post(
        "https://x2twitter.com/api/ajaxSearch",
        qs.stringify({ q: url, lang: "id", cftoken: token }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" } }
      );

      if (searchRes.data.status !== "ok") throw new Error("Gagal memproses URL");

      const $ = cheerio.load(searchRes.data.data);
      const result = [];
      $(".dl-action a").each((_, el) => {
        const quality = $(el).text().trim();
        const link = $(el).attr("href");
        if (link && link.startsWith("https://dl.snapcdn.app")) {
          result.push({ quality, link });
        }
      });

      return {
        success: true,
        title: $(".tw-middle h3").text().trim(),
        thumbnail: $(".thumbnail img").attr("src"),
        downloads: result
      };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  app.get(`${prefix}/social/x-twitter`, async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ success: false, message: "Parameter ?url= wajib" });
    const data = await x2twitter(url);
    if (!data.success) return res.status(500).json(data);
    res.json(data);
  });
};
