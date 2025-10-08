/**
 * Sayuki AI Dashboard — Advanced Server
 * Features:
 * 🌐 Auto Localization
 * 💡 Smart Insight Panel
 * 🌍 Realtime Global Map
 * 📬 Telegram Notifications
 * 🎨 Dynamic AI Banner
 * 🎥 Animated Video Background
 * 🇨🇦 Country Full Name + Flags Support
 */

const express = require("express");
const chalk = require("chalk");
const fs = require("fs");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const path = require("path");
const geoip = require("geoip-lite");
const axios = require("axios");
// Pastikan waktu serverStartTime tersimpan secara global
if (!global.serverStartTime) {
  global.serverStartTime = new Date();
  console.log(`🚀 Server started at: ${global.serverStartTime.toISOString()}`);
}

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 4000;
const SELF_HOST = process.env.SELF_HOST || `http://localhost:${PORT}`;
const io = new Server(server, { cors: { origin: "*" } });
app.enable("trust proxy");
app.set("json spaces", 2);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.use("/", express.static(path.join(__dirname, "api-page")));
app.use("/src", express.static(path.join(__dirname, "src")));

// ===============================
// Telegram Configuration
// ===============================
const TELEGRAM_BOT_TOKEN = '8358144699:AAEch2i3dBXYjIMwYRD0F8vKjvNopg8pCOM'; // Ganti dengan Token Bot
const TELEGRAM_CHAT_ID = '8243394905'; // Ganti dengan Chat ID
const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
const settingsPath = path.join(__dirname, './src/settings.json');
let settings = { categories: [] };
try {
  settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
} catch (err) {
  console.warn("settings.json not found or invalid. Health monitor will have no endpoints.");
}


// Ganti ini dengan token & chat ID milik kamu
// 🧩 Queue untuk menampung pesan
let telegramQueue = [];
let telegramTimer = null;
const TELEGRAM_DEBOUNCE_MS = 10 * 1000; // 10 detik

/**
 * ✅ Fungsi utama pengirim pesan (dengan debounce)
 */
async function sendTelegramNotification(message) {
  try {
    // Tambahkan ke queue
    telegramQueue.push(message);

    // Kalau belum ada timer, buat baru
    if (!telegramTimer) {
      telegramTimer = setTimeout(async () => {
        const batchedMessage = telegramQueue.join("\n\n"); // gabungkan semua pesan
        telegramQueue = [];
        telegramTimer = null;

        // Kirim pesan gabungan ke Telegram
        if (batchedMessage.trim() !== "") {
        const MAX_TELEGRAM_MESSAGE = 4000;
const safeMessage = batchedMessage.slice(0, MAX_TELEGRAM_MESSAGE);
          await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID,
            text: batchedMessage,
            parse_mode: "HTML"
          });

          console.log(`📬 Telegram batch sent (${batchedMessage.length} chars)`);
        }
      }, TELEGRAM_DEBOUNCE_MS);
    }
  } catch (err) {
    console.error("⚠️ Telegram queue error:", err.message);
  }
}



// ===============================
// Country Name Mapping (ISO → Full Name)
// ===============================
const countryNames = {
  ID: "Indonesia",
  US: "United States",
  JP: "Japan",
  MY: "Malaysia",
  SG: "Singapore",
  IN: "India",
  PH: "Philippines",
  CN: "China",
  KR: "South Korea",
  TH: "Thailand",
  VN: "Vietnam",
  GB: "United Kingdom",
  DE: "Germany",
  FR: "France",
  IT: "Italy",
  ES: "Spain",
  BR: "Brazil",
  RU: "Russia",
  CA: "Canada",
  AU: "Australia",
  AE: "United Arab Emirates"
};

// ===============================
// Global Stats Memory
// ===============================
let stats = {
  requests: 0,
  success: 0,
  error: 0,
  perRoute: {},
  globalUsage: {}
};

// ===============================
// Helper: Detect Country from Request
// ===============================
function detectCountry(req) {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  let country = "Unknown";

  if (req.headers["cf-ipcountry"]) {
    country = req.headers["cf-ipcountry"];
  } else {
    const geo = geoip.lookup(ip);
    country = geo?.country || "ID";
  }

  return country.toUpperCase();
}
// Jalankan health check setiap 120 jam (5 hari sekali)
const HEALTH_CHECK_INTERVAL_MS = 432_000_000; // 120 jam = 5 hari
const MAX_CHECKS_PER_ENDPOINT = 10; // simpan 10 hasil terakhir aja, cukup


// Build list of endpoints from settings
function extractEndpointsFromSettings(settings) {
  const endpoints = [];
  if (!settings || !Array.isArray(settings.categories)) return endpoints;
  settings.categories.forEach(category => {
    (category.items || []).forEach(item => {
      if (item && item.path) {
        // Store path and method
        endpoints.push({
          name: item.name || item.path,
          desc: item.desc || '',
          path: item.path,
          method: (item.method || 'GET').toUpperCase()
        });
      }
    });
  });
  return endpoints;
}

const endpoints = extractEndpointsFromSettings(settings);

// In-memory storage: map path -> array of checks (oldest first)
const checksStore = {};
// initialize keys
endpoints.forEach(e => { checksStore[e.path] = []; });

// Helper to make absolute URL for path
function makeAbsoluteUrl(pathStr) {
  if (!pathStr) return null;
  if (pathStr.startsWith('http://') || pathStr.startsWith('https://')) return pathStr;
  // If path contains query placeholders already, keep as is
  return `${SELF_HOST}${pathStr}`;
}

// Single health check
async function runCheckForEndpoint(endpoint) {
  const url = makeAbsoluteUrl(endpoint.path);
  const method = endpoint.method || 'GET';
  const started = Date.now();
  let result = {
    timestamp: new Date().toISOString(),
    path: endpoint.path,
    name: endpoint.name,
    ok: false,
    statusCode: null,
    latencyMs: null,
    error: null
  };

  try {
    const resp = await axios.request({
      url,
      method,
      timeout: 5000,
      validateStatus: () => true // don't throw for 4xx/5xx
    });
    result.statusCode = resp.status;
    result.ok = resp.status >= 200 && resp.status < 400;
    result.latencyMs = Date.now() - started;
  } catch (err) {
    result.error = err.message || String(err);
    result.latencyMs = Date.now() - started;
  }

  // push to store
  if (!checksStore[endpoint.path]) checksStore[endpoint.path] = [];
  checksStore[endpoint.path].push(result);
  // rolling window trim
  if (checksStore[endpoint.path].length > MAX_CHECKS_PER_ENDPOINT) {
    checksStore[endpoint.path].shift();
  }

  return result;
}

// Run checks for all endpoints (one cycle)
async function runAllChecks() {
  const proms = endpoints.map(ep => runCheckForEndpoint(ep).catch(e => {
    console.error("Health check error:", e);
    return null;
  }));
  const results = await Promise.all(proms);
  // flatten timeline: we won't store global timeline separately; clients can query aggregated view
  return results.filter(Boolean);
}

// Start periodic checks
let healthIntervalHandle = null;

// --------------------
// Health API endpoints
// --------------------

// 1) Current status per endpoint (most recent check)
app.get('/health/checks', (req, res) => {
  const summary = endpoints.map(e => {
    const arr = checksStore[e.path] || [];
    const last = arr.length ? arr[arr.length - 1] : null;
    return {
      name: e.name,
      path: e.path,
      method: e.method,
      last
    };
  });
  res.json({ status: true, timestamp: new Date().toISOString(), endpoints: summary });
});

// 2) Timeline of events (flattened recent checks across endpoints)
// query param: limit (default 200)
app.get('/health/timeline', (req, res) => {
  const limit = Math.min(1000, parseInt(req.query.limit || '200', 10));
  const all = [];
  Object.keys(checksStore).forEach(path => {
    (checksStore[path] || []).forEach(ch => {
      all.push(ch);
    });
  });
  // sort desc by timestamp
  all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json({ status: true, count: all.length, timeline: all.slice(0, limit) });
});

// 3) Uptime percentages per endpoint (rolling window according to stored checks)
app.get('/health/uptime', (req, res) => {
  const result = endpoints.map(e => {
    const arr = checksStore[e.path] || [];
    const total = arr.length;
    const up = arr.filter(c => c.ok).length;
    const uptimePercent = total > 0 ? ((up / total) * 100).toFixed(2) : null;
    // compute avg latency
    const latencies = arr.map(c => c.latencyMs || 0).filter(v => v > 0);
    const avgLatency = latencies.length ? (latencies.reduce((a,b)=>a+b,0)/latencies.length).toFixed(2) : null;
    return {
      name: e.name,
      path: e.path,
      totalChecks: total,
      upCount: up,
      uptimePercent,
      avgLatencyMs: avgLatency
    };
  });

  // global uptime: average of endpoints with data
  const withData = result.filter(r => r.uptimePercent !== null);
  const globalUptime = withData.length ? (withData.reduce((s, r) => s + parseFloat(r.uptimePercent), 0) / withData.length).toFixed(2) : null;

  res.json({ status: true, generatedAt: new Date().toISOString(), globalUptime, endpoints: result });
});

// 4) Public Status summary (simple)
app.get('/status/public', (req, res) => {
  // determine overall health: if any endpoint last check is down -> WARN/DEGRADED/OUTAGE
  const epSummaries = endpoints.map(e => {
    const arr = checksStore[e.path] || [];
    const last = arr.length ? arr[arr.length - 1] : null;
    return { name: e.name, path: e.path, last, uptimePercent: (arr.length ? ((arr.filter(c => c.ok).length / arr.length) * 100).toFixed(2) : null) };
  });

  const anyDown = epSummaries.some(s => s.last && !s.last.ok);
  const overall = anyDown ? 'degraded' : 'operational';
  res.json({
    status: true,
    service: 'Sayuki API Dashboard',
    overall,
    summary: epSummaries,
    generatedAt: new Date().toISOString()
  });
});

// 5) Manual trigger (for debugging)
app.post('/health/run', async (req, res) => {
  try {
    const results = await runAllChecks();
    res.json({ status: true, runAt: new Date().toISOString(), results });
  } catch (err) {
    res.status(500).json({ status: false, error: err.message || String(err) });
  }
});

// ===============================
// Middleware Logging
// ===============================
// ====== Tambahkan di atas ======
let lastSummarySent = 0;
const SUMMARY_INTERVAL = 7 * 24 * 60 * 60 * 1000; // 7 hari (ms)

app.use((req, res, next) => {
  const start = Date.now();
  const countryCode = detectCountry(req);
  const countryName = countryNames[countryCode] || "Global";

  if (!stats.globalUsage[countryCode]) stats.globalUsage[countryCode] = 0;
  stats.globalUsage[countryCode]++;

  res.on("finish", () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const route = req.path.split("?")[0];

    const color =
      statusCode >= 500 ? "bgRed" :
      statusCode >= 400 ? "bgYellow" :
      statusCode >= 300 ? "bgBlue" : "bgGreen";

    console.log(
      chalk.gray(`[${new Date().toLocaleTimeString()}]`) +
      chalk.white(` ${req.method} `) +
      chalk[color].black(` ${statusCode} `) +
      chalk.white(` ${req.originalUrl} `) +
      chalk.cyan(` (${countryName}) `) +
      chalk.magenta(` - ${duration}ms`)
    );

  });

  next();
});


app.get("/api/ping", (req, res) => {
  setTimeout(() => {
    res.json({ pong: true, time: new Date().toISOString() });
  }, Math.random() * 300);
});

// ===============================
// API Stats Routes
// ===============================
app.get("/stats/live", (req, res) => {
  res.json({
    status: 200,
    uptime: process.uptime(),
    requests: stats.requests,
    success: stats.success,
    error: stats.error
  });
});

app.get("/stats/live/perRoute", (req, res) => {
  const perRouteArray = Object.keys(stats.perRoute)
    .map(route => ({
      route,
      count: stats.perRoute[route].count,
      avgLatency: stats.perRoute[route].avgLatency.toFixed(2)
    }))
    .sort((a, b) => b.count - a.count);
  res.json({ status: 200, perRoute: perRouteArray });
});

app.get("/stats/live/globalUsage", (req, res) => {
  const usageArray = Object.keys(stats.globalUsage)
    .map(code => ({
      countryCode: code,
      countryName: countryNames[code] || "Global",
      count: stats.globalUsage[code]
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  res.json({ status: 200, topCountries: usageArray });
});
// ===============================
// Auto Localization
// ===============================
app.get("/locale", (req, res) => {
  const countryCode = detectCountry(req);
  const countryName = countryNames[countryCode] || "Global";

  let language = "en";
  if (["ID", "MY"].includes(countryCode)) language = "id";
  if (countryCode === "JP") language = "jp";

  res.json({ status: true, language, countryCode, countryName });
});

// ===============================
// Smart Insight Panel
// ===============================
app.get("/stats/insight", (req, res) => {
  const totalRequests = stats.requests;
  const totalErrors = stats.error;
  const successRate = totalRequests > 0 ? ((stats.success / totalRequests) * 100).toFixed(2) : 0;

  const topRoute = Object.entries(stats.perRoute)
    .sort((a, b) => b[1].count - a[1].count)[0]?.[0] || "Belum ada data";

  const topCountryCode = Object.entries(stats.globalUsage)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || "ID";
  const topCountryName = countryNames[topCountryCode] || "Global";

  res.json({
    status: true,
    totalRequests,
    totalErrors,
    successRate,
    topRoute,
    topCountryCode,
    topCountryName
  });
});

// ===============================
// Auto Load API Routes
// ===============================
const apiFolder = path.join(__dirname, "./src/api");
fs.readdirSync(apiFolder).forEach(subfolder => {
  const subfolderPath = path.join(apiFolder, subfolder);
  if (fs.statSync(subfolderPath).isDirectory()) {
    fs.readdirSync(subfolderPath).forEach(file => {
      const filePath = path.join(subfolderPath, file);
      if (path.extname(file) === ".js") {
        const route = require(filePath);
if (typeof route === "function") {
  route(app, "/endpoint");
} else {
  console.warn(`⚠️ Skip ${filePath}: not a valid route function`);
}
      }
    });
  }
});

// ===============================
// Static Pages
// ===============================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "api-page", "index.html"));
});
app.get("/statserver", (req, res) => {
  res.sendFile(path.join(__dirname, "api-page", "server-stats.html"));
});
app.use("/styles.css", express.static(path.join(__dirname, "api-page", "styles.css")));
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, "api-page", "404.html")));

// ===============================
// Start Server
// ===============================
app.listen(PORT, () => {
  console.log(chalk.bgHex("#40E0D0").black.bold(` Server aktif di port ${PORT} `));
});
