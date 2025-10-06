/**
 * Ambil data profil Instagram via BoostFluence API
 */

const axios = require("axios");

module.exports = function (app, prefix = "") {
  app.get(`${prefix}/stalk/instagram`, async (req, res) => {
    const { username } = req.query;
    if (!username)
      return res.status(400).json({ status: false, message: "Parameter ?username= wajib diisi" });

    try {
      const response = await axios.post(
        "https://api.boostfluence.com/api/instagram-profile-v2",
        { username },
        { headers: { "Content-Type": "application/json" } }
      );

      const profile = response.data;
      if (!profile || !profile.username)
        return res.status(404).json({ status: false, message: "Akun tidak ditemukan atau private" });

      res.json({
        status: true,
        data: {
          username: profile.username,
          fullname: profile.full_name,
          followers: profile.follower_count,
          following: profile.following_count,
          posts: profile.media_count,
          bio: profile.biography,
          pic: profile.profile_pic_url_hd,
          is_private: profile.is_private,
          is_verified: profile.is_verified,
          timestamp: new Date().toISOString()
        }
      });

    } catch (e) {
      const errorMsg = e.response?.data || e.message || "Unknown error";
      console.error("⚠️ Error Instagram API:", errorMsg);
      res.status(500).json({ status: false, message: "Gagal mengambil data Instagram", error: errorMsg });
    }
  });
};
