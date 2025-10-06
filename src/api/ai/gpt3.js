/**
 * GPT-3 Interaction Endpoint
 * Example: /api/ai/gpt3?prompt=You%20are%20a%20helpful%20assistant.&content=Tell%20me%20a%20joke.
 */
module.exports = function (app, prefix = '') {
  const axios = require("axios");

  app.get(`${prefix}/ai/gpt3`, async (req, res) => {
    const { prompt, content } = req.query;

    if (!prompt || !content) {
      return res.status(400).json({
        status: false,
        message: "Parameter ?prompt= dan ?content= wajib diisi"
      });
    }

    try {
      // Ganti URL API sesuai kebutuhanmu
      const response = await axios.get("https://api.siputzx.my.id/api/ai/gpt3", {
        params: { prompt, content },
      });

      res.json({
        status: true,
        data: response.data.data,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error("GPT3 API ERROR:", err.response?.data || err.message);
      res.status(500).json({
        status: false,
        error: err.response?.data || err.message
      });
    }
  });
};
