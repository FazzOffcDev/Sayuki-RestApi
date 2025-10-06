/**

* Free Proxy List (Nekolabs)
* GET /endpoint/tools/free-proxy
  */
  module.exports = function (app, prefix = '') {
  const axios = require("axios");

app.get(`${prefix}/tools/free-proxy`, async (req, res) => {
try {
// langsung proxy ke API nekolabs
const apiRes = await axios.get("https://api.nekolabs.my.id/tools/free-proxy", {
params: req.query // meneruskan query jika ada filter di masa depan
});
  // kembalikan response apa adanya
  res.status(apiRes.status === 200 ? 200 : 200).json(apiRes.data);
} catch (err) {
  console.error("Free-Proxy ERROR:", err.response?.data || err.message);
  res.status(500).json({
    status: false,
    error: err.response?.data || err.message || "Terjadi kesalahan saat mengambil daftar proxy"
  });
}

});
};
