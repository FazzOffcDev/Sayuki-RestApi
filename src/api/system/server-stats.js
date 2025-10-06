const os = require("os");
const osUtils = require("os-utils");
const moment = require("moment");

module.exports = function (app, prefix = "") {
  app.get(`${prefix}/system/stats`, async (req, res) => {
    try {
      // ✅ Pastikan nilai default selalu ada
      const startTime = global.serverStartTime || new Date();
      const uptimeSeconds = Math.floor((Date.now() - startTime.getTime()) / 1000);

      const uptimeText = formatDuration(uptimeSeconds);

      osUtils.cpuUsage(cpuPercent => {
        res.json({
          status: true,
          platform: os.platform(),
          arch: os.arch(),
          cpus: os.cpus().length,
          cpuUsage: `${(cpuPercent * 100).toFixed(1)}%`,
          memoryUsed: `${((os.totalmem() - os.freemem()) / 1024 / 1024).toFixed(1)} MB`,
          memoryTotal: `${(os.totalmem() / 1024 / 1024).toFixed(1)} MB`,
          uptimeText,
          startedAt: moment(startTime).format("YYYY-MM-DD HH:mm:ss"),
          timestamp: moment().format("YYYY-MM-DD HH:mm:ss")
        });
      });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  });
};

function formatDuration(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${days > 0 ? days + " hari, " : ""}${hours} jam, ${minutes} menit, ${secs} detik`;
}
