const os = require("os");
const osUtils = require("os-utils");
const moment = require("moment");

module.exports = function (app, prefix = "") {
  app.get(`${prefix}/system/stats`, async (req, res) => {
    try {
      const uptimeSeconds = Math.floor((Date.now() - global.serverStartTime.getTime()) / 1000);
      const uptimeText = formatDuration(uptimeSeconds);

      osUtils.cpuUsage(cpuPercent => {
        const stats = {
          status: true,
          platform: os.platform(),
          arch: os.arch(),
          cpus: os.cpus().length,
          cpuUsage: `${(cpuPercent * 100).toFixed(1)}%`,
          memoryUsed: `${((os.totalmem() - os.freemem()) / 1024 / 1024).toFixed(1)} MB`,
          memoryTotal: `${(os.totalmem() / 1024 / 1024).toFixed(1)} MB`,
          uptimeText,
          startedAt: moment(global.serverStartTime).format("YYYY-MM-DD HH:mm:ss"),
          timestamp: moment().format("YYYY-MM-DD HH:mm:ss")
        };
        res.json(stats);
      });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  });
};

// 🧠 Fungsi untuk ubah detik ke format hari, jam, menit, detik
function formatDuration(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${days > 0 ? days + " hari, " : ""}${hours} jam, ${minutes} menit, ${secs} detik`;
}
