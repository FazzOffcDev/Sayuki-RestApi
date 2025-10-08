/**
 * GET /api/anime/random
 * Fetch random anime quotes from https://katanime.vercel.app/api/getrandom
 * Query:
 *   - count (optional, default 5, max 20)
 *
 * Response:
 * {
 *   status: true,
 *   source: "katanime",
 *   count: 5,
 *   quotes: [{ id, english, indo, character, anime }, ...]
 * }
 */

const axios = require("axios");

module.exports = function (app, prefix = "") {
  // simple in-memory cache to avoid excessive upstream calls
  let cache = {
    ts: 0,
    ttlMs: 10 * 60 * 1000, // 10 minutes
    data: null
  };

  async function fetchUpstream() {
    const now = Date.now();
    if (cache.data && now - cache.ts < cache.ttlMs) {
      return cache.data;
    }

    const url = "https://katanime.vercel.app/api/getrandom";
    const res = await axios.get(url, {
      headers: { "User-Agent": "Sayuki-Anime-Quotes/1.0" },
      timeout: 15000
    });

    if (!res.data || res.data.sukses !== true || !Array.isArray(res.data.result)) {
      throw new Error("Invalid upstream response");
    }

    cache = {
      ts: now,
      ttlMs: cache.ttlMs,
      data: res.data.result
    };

    return cache.data;
  }

  // utility: pick N random elements (without replacement)
  function sampleArray(arr, n) {
    const copy = arr.slice();
    const out = [];
    n = Math.min(n, copy.length);
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(Math.random() * copy.length);
      out.push(copy.splice(idx, 1)[0]);
    }
    return out;
  }

  app.get(`${prefix}/anime/random`, async (req, res) => {
    try {
      const raw = await fetchUpstream();
      const q = Math.max(1, Math.min(parseInt(req.query.count || "5", 10) || 5, 20)); // 1..20
      const picked = sampleArray(raw, q);

      // normalize objects to ensure fields exist
      const quotes = picked.map(item => ({
        id: item.id ?? null,
        english: (item.english || "").trim(),
        indo: (item.indo || "").trim(),
        character: item.character || null,
        anime: item.anime || null
      }));

      res.json({
        status: true,
        source: "sayukimultidevice",
        count: quotes.length,
        quotes
      });
    } catch (err) {
      console.error("Anime Quotes Error:", err.message || err);
      // upstream possibly down — return friendly error
      return res.status(502).json({
        status: false,
        message: "Gagal mengambil quote dari upstream.",
        error: err.message || "upstream_error"
      });
    }
  });

  // convenience route: single random quote
  app.get(`${prefix}/anime/random/one`, async (req, res) => {
    req.query.count = "1";
    return app._router.handle(req, res, () => {});
  });
};
