// sfile.js
module.exports = function (app, prefix = '') {
  const axios = require("axios");
  app.get(`${prefix}/download/sfile`, async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ success: false, message: "?url= wajib" });
    try {
      const resp = await axios.get("https://sfile-download-api.com/convert", {
        params: { url },
        headers: { "x-api-key": '984c95eb6fmsh376437640dfb858p1194f1jsnf0df8c31888b' }
      });
      res.json(resp.data);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
};
