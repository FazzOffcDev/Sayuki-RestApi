const express = require("express");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");

const upload = multer({ storage: multer.memoryStorage() });

module.exports = function (app, prefix = "") {
  app.post(`${prefix}/tools/removebg`, upload.single("image"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ status: false, message: "No image uploaded." });

      // Kirim buffer file langsung ke API remove.bg
      const formData = new FormData();
      formData.append("image_file", req.file.buffer, {
        filename: req.file.originalname,
      });
      formData.append("size", "auto");

      const response = await axios.post("https://api.remove.bg/v1.0/removebg", formData, {
        headers: {
          ...formData.getHeaders(),
          "X-Api-Key": "BoGGmXwM3BfuF9Jgg9DN1RFC",
        },
        responseType: "arraybuffer",
      });

      res.setHeader("Content-Type", "image/png");
      res.send(response.data);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({
        status: false,
        message: "Failed to process image.",
        error: err.message,
      });
    }
  });
};
