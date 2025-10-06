/**
* Remove Background (Upload / URL)
*/
module.exports = function (app, prefix = '') {
  const axios = require("axios");
  const FormData = require("form-data");
  const multer = require("multer");
  const fs = require("fs");

  const upload = multer({ dest: "uploads/" });

  async function removeBgFromUrl(imageUrl) {
    try {
      const form = new FormData();
      form.append("image_url", imageUrl);

      const res = await axios.post("https://api.remove.bg/v1.0/removebg", form, {
        headers: { ...form.getHeaders(), "X-Api-Key": process.env.REMOVEBG_KEY || "DEMO_KEY" },
        responseType: "arraybuffer"
      });

      return { success: true, buffer: res.data.toString("base64") };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  async function removeBgFromFile(filePath) {
    try {
      const form = new FormData();
      form.append("image_file", fs.createReadStream(filePath));

      const res = await axios.post("https://api.remove.bg/v1.0/removebg", form, {
        headers: { ...form.getHeaders(), "X-Api-Key": process.env.REMOVEBG_KEY || "DEMO_KEY" },
        responseType: "arraybuffer"
      });

      fs.unlinkSync(filePath);
      return { success: true, buffer: res.data.toString("base64") };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  // URL mode
  app.get(`${prefix}/tools/removebg`, async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ success: false, message: "Param ?url= wajib" });

    const result = await removeBgFromUrl(url);
    if (!result.success) return res.status(500).json(result);

    res.json(result); // bisa decode base64 jadi image di client
  });

  // Upload mode
  app.post(`${prefix}/tools/removebg`, upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: "File wajib diupload!" });

    const result = await removeBgFromFile(req.file.path);
    if (!result.success) return res.status(500).json(result);

    res.json(result);
  });
};
