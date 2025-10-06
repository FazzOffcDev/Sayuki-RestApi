/**
 * /api/system/stats — Server Statistics Endpoint
 * Mengembalikan CPU, RAM, Disk, dan Network Info
 */

const os = require("os");
const fs = require("fs");

module.exports = function (app, prefix = "") {
  app.get(`${prefix}/system/stats`, async (req, res) => {
    try {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const cpuLoad = os.loadavg(); // [1m, 5m, 15m]
      const uptime = os.uptime();
      const cpus = os.cpus();

      // Disk usage (Linux-based)
      let disk = { total: 0, free: 0, used: 0 };
      try {
        const { execSync } = require("child_process");
        const result = execSync("df -k / | tail -1").toString().split(/\s+/);
        disk = {
          total: parseInt(result[1]) * 1024,
          used: parseInt(result[2]) * 1024,
          free: parseInt(result[3]) * 1024,
        };
      } catch {}

      const data = {
        cpuCount: cpus.length,
        cpuLoad: {
          "1min": cpuLoad[0].toFixed(2),
          "5min": cpuLoad[1].toFixed(2),
          "15min": cpuLoad[2].toFixed(2),
        },
        memory: {
          total: totalMem,
          used: usedMem,
          free: freeMem,
          usagePercent: ((usedMem / totalMem) * 100).toFixed(1),
        },
        disk: {
          total: disk.total,
          used: disk.used,
          free: disk.free,
          usagePercent: disk.total ? ((disk.used / disk.total) * 100).toFixed(1) : null,
        },
        uptimeSeconds: uptime,
        uptimeReadable: formatUptime(uptime),
        hostname: os.hostname(),
        platform: os.platform(),
        timestamp: new Date().toISOString(),
      };

      res.json({ status: true, data });
    } catch (err) {
      res.status(500).json({ status: false, error: err.message });
    }
  });
};

function formatUptime(seconds) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}
