/**
 * Claude 3.5 Haiku AI API (via api.nekolabs.my.id)
 */
module.exports = function (app, prefix = '') {
  const axios = require("axios");

  // Endpoint: /ai/claude/3.5-haiku
  app.get(`${prefix}/ai/claude/3.5-haiku`, async (req, res) => {
    const { text, systemPrompt, imageUrl } = req.query;
    
    // Parameter 'text' wajib diisi
    if (!text) {
        return res.status(400).json({ 
            status: false, 
            code: 400,
            message: "Parameter ?text= wajib diisi sebagai prompt utama." 
        });
    }

    try {
      const apiUrl = 'https://api.nekolabs.my.id/ai/claude/3.5-haiku';
      
      const response = await axios.get(apiUrl, {
        params: { 
            text: text,
            // Jika systemPrompt atau imageUrl tidak ada di query, parameter tidak dikirim
            ...(systemPrompt && { systemPrompt: systemPrompt }),
            ...(imageUrl && { imageUrl: imageUrl })
        },
      });

      // Berikan respon langsung dari API eksternal
      res.json(response.data);
    } catch (err) {
      console.error("CLAUDE 3.5 HAIKU API ERROR:", err.message);
      res.status(500).json({ 
          status: false, 
          error: err.message,
          message: "Gagal memproses permintaan Claude 3.5 Haiku di server."
      });
    }
  });
};