/**
 * GitHub User Stalker
 * Mengambil metadata detail pengguna GitHub dari API resmi.
 */
module.exports = function (app, prefix = '') {
  const axios = require('axios');
  
  const GITHUB_API_URL = 'https://api.github.com/users/';
  
  /**
   * Mengambil dan memproses data pengguna dari GitHub API.
   * @param {string} user Username GitHub.
   * @returns {Promise<object>} Objek berisi metadata pengguna yang sudah diproses.
   */
  async function githubstalk(user) {
    if (!user) {
        throw new Error("Username GitHub tidak boleh kosong.");
    }
    
    // Panggilan ke GitHub API
    const response = await axios.get(GITHUB_API_URL + user, {
        headers: {
            // Header User-Agent wajib untuk API GitHub
            'User-Agent': 'Node.js API Client (Your App Name/Version)',
            // Anda dapat menambahkan token otorisasi jika menghadapi rate limit
            // Authorization: 'token YOUR_GITHUB_TOKEN' 
        }
    });
    
    const data = response.data;

    // Map data sesuai dengan struktur yang diminta
    return {
        username: data.login,
        nickname: data.name,
        bio: data.bio,
        id: data.id,
        nodeId: data.node_id,
        profile_pic: data.avatar_url,
        url: data.html_url,
        type: data.type,
        admin: data.site_admin,
        company: data.company,
        blog: data.blog,
        location: data.location,
        email: data.email,
        public_repo: data.public_repos,
        public_gists: data.public_gists,
        followers: data.followers,
        following: data.following,
        ceated_at: data.created_at,
        updated_at: data.updated_at
    };
  }

  // --- ENDPOINT EXPRESS.JS ---
  app.get(`${prefix}/stalk/github`, async (req, res) => {
    const { q } = req.query; // Menggunakan 'q' sebagai query untuk username

    if (!q) {
        return res.status(400).json({
            status: false,
            code: 400,
            message: "Parameter ?q= wajib diisi dengan username GitHub."
        });
    }

    try {
      console.log(`[GitHub Stalker] Mencari user: ${q}`);
      const result = await githubstalk(q);
      
      res.json({
          status: true,
          code: 200,
          message: `Informasi pengguna GitHub "${q}" berhasil diambil.`,
          result: result
      });

    } catch (err) {
      let errorMessage = err.message;
      // Menangani status 404 dari GitHub API (pengguna tidak ditemukan)
      if (err.response && err.response.status === 404) {
          errorMessage = `Pengguna GitHub "${q}" tidak ditemukan.`;
      }
      
      console.error("[GitHub Stalker] ERROR:", errorMessage);
      res.status(500).json({
          status: false,
          error: errorMessage,
          message: `Gagal memproses permintaan GitHub: ${errorMessage}`
      });
    }
  });
};
