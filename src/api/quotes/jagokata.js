/**
 * Fitur untuk mengambil kutipan acak (quotes) dan peribahasa acak dari JagoKata API.
 * 1. Endpoint: /info/jagokata (Quotes Acak)
 * 2. Endpoint: /info/peribahasa (Peribahasa Acak)
 */
module.exports = function (app, prefix = '') {
  const axios = require("axios");

  // URL API JagoKata
  const JAGO_KATA_QUOTES_URL = 'https://jagokata-api.rf.gd/acak.php';
  const JAGO_KATA_PERIBAHASA_URL = 'https://jagokata-api.rf.gd/peribahasa-acak.php';

  // --- Fungsi 1: Fetch Random Quotes (Tidak Berubah) ---

  async function fetchRandomQuotes() {
    try {
      console.log("[JagoKata] Mengambil 10 kutipan acak...");
      const response = await axios.get(JAGO_KATA_QUOTES_URL);
      const data = response.data;
      
      if (data.status !== "200" || !data.data || !data.data.quotes) {
          throw new Error("Respons API JagoKata Quotes tidak valid atau error.");
      }
      return data;

    } catch (err) {
      console.error("[JagoKata Quotes] ERROR:", err.message);
      throw new Error(`Gagal mengambil kutipan JagoKata: ${err.message}`);
    }
  }

  // --- Fungsi 2: Fetch Random Peribahasa (BARU) ---
  
  async function fetchRandomPeribahasa() {
    try {
      console.log("[JagoKata] Mengambil 10 peribahasa acak...");
      
      const response = await axios.get(JAGO_KATA_PERIBAHASA_URL);
      const data = response.data; // Respons seharusnya adalah {status, author, data: [...]}

      // Cek struktur respons: data.status harus "200" dan data.data harus berupa array
      if (data.status !== "200" || !Array.isArray(data.data)) {
          throw new Error("Respons API JagoKata Peribahasa tidak valid atau error.");
      }

      // Mengembalikan seluruh data respons
      return data;

    } catch (err) {
      console.error("[JagoKata Peribahasa] ERROR:", err.message);
      throw new Error(`Gagal mengambil peribahasa JagoKata: ${err.message}`);
    }
  }

  // --- ENDPOINT 1: GET RANDOM QUOTES ---
  app.get(`${prefix}/info/jagokata`, async (req, res) => {
    try {
      const quoteData = await fetchRandomQuotes();
      res.json({
          status: true,
          code: 200,
          result: quoteData
      });
    } catch (err) {
      res.status(500).json({ 
          status: false, 
          error: err.message,
          message: "Gagal memproses permintaan Quotes JagoKata di server."
      });
    }
  });

  // --- ENDPOINT 2: GET RANDOM PERIBAHASA (BARU) ---
  app.get(`${prefix}/info/peribahasa`, async (req, res) => {
    try {
      const peribahasaData = await fetchRandomPeribahasa();
      res.json({
          status: true,
          code: 200,
          result: peribahasaData
      });
    } catch (err) {
      res.status(500).json({ 
          status: false, 
          error: err.message,
          message: "Gagal memproses permintaan Peribahasa JagoKata di server."
      });
    }
  });
};
