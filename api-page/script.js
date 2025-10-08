// ===============================================
// Bagian 1: Utilitas Histori Request (Local Storage)
// ===============================================
const HISTORY_KEY = 'api_request_history';
const MAX_HISTORY = 5;

function loadHistory() {
    try {
        const history = localStorage.getItem(HISTORY_KEY);
        return history ? JSON.parse(history) : [];
    } catch (e) {
        console.error("Error memuat histori:", e);
        return [];
    }
}

function saveHistory(entry) {
    const history = loadHistory();
    history.unshift(entry); 
    if (history.length > MAX_HISTORY) {
        history.pop(); 
    }
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    const historyList = document.getElementById('requestHistoryList');
    const history = loadHistory();
    
    if (!historyList) return;

    if (history.length === 0) {
        historyList.innerHTML = '<p class="small text-muted mb-0">Belum ada request.</p>';
        return;
    }

    let html = '';
    history.forEach(item => {
        let statusClass = 'text-success';
        if (item.status >= 400 && item.status < 500) statusClass = 'text-warning';
        if (item.status >= 500 || item.status === 'ERR') statusClass = 'text-danger';

        html += `
            <div class="d-flex justify-content-between small px-2 py-1" style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <span class="text-secondary">${item.time}</span>
                <span class="text-truncate mx-2 text-monospace" title="${item.path.split('?')[0]}">${item.path.split('?')[0].replace('/endpoint', '')}</span>
                <span class="${statusClass} fw-bold">${item.status}</span>
            </div>
        `;
    });
    historyList.innerHTML = html;
}
const HEALTH_CHECKS_POLL_MS = 500000; // frontend poll interval
const TIMELINE_LIMIT = 8000;

async function fetchJson(url) {
  try {
    const r = await fetch(url, { cache: "no-store" });
    return await r.json();
  } catch (err) {
    console.error("fetchJson error", url, err);
    return null;
  }
}

function makeHealthCardHtml(ep) {
  const last = ep.last;
  let statusClass = 'health-bad';
  let statusText = 'Unknown';
  let latencyText = '--';
  if (last) {
    if (last.ok) { statusClass = 'health-good'; statusText = `OK (${last.statusCode})`; }
    else if (last.statusCode >= 400 && last.statusCode < 500) { statusClass = 'health-warn'; statusText = `Warn (${last.statusCode})`; }
    else { statusClass = 'health-bad'; statusText = last.statusCode ? `Down (${last.statusCode})` : 'Error'; }
    latencyText = last.latencyMs ? `${last.latencyMs} ms` : (last.error || '--');
  } else {
    statusClass = 'health-warn';
    statusText = 'No data';
  }

  // flag image if path includes country code? We don't have code here. We'll show simple card.
  return `
    <div class="stat-card ${statusClass}">
      <div class="d-flex justify-content-between align-items-start">
        <div>
          <div class="fw-bold">${ep.name}</div>
          <div class="small-muted">${ep.path}</div>
        </div>
        <div class="text-end">
          <div class="latency-small">${latencyText}</div>
          <div class="fw-bold">${statusText}</div>
        </div>
      </div>
    </div>
  `;
}
async function loadUptime() {
  try {
    const res = await fetch("/api/system/stats");
    const data = await res.json();

    if (data.status) {
      const uptimeText = document.getElementById("uptime-text");
      const uptimeStart = document.getElementById("uptime-start");

      uptimeText.textContent = data.uptimeText;
      uptimeStart.textContent = data.startedAt;

      uptimeText.style.textShadow = "0 0 10px cyan";
      setTimeout(() => (uptimeText.style.textShadow = "none"), 600);
    }
  } catch (err) {
    console.error("Failed to load uptime:", err);
  }
}

// ⏱ Update tiap 5 detik
loadUptime();
setInterval(loadUptime, 15000);

function makeUptimeItemHtml(u) {
  const percText = u.uptimePercent !== null && u.uptimePercent !== undefined ? `${u.uptimePercent}%` : 'n/a';
  const fillWidth = u.uptimePercent ? Math.max(0, Math.min(100, parseFloat(u.uptimePercent))) : 0;
  return `
    <div class="stat-card mb-2">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <div class="fw-bold">${u.name}</div>
          <div class="small-muted">${u.path}</div>
        </div>
        <div style="min-width:110px;">
          <div class="text-end fw-bold">${percText}</div>
          <div class="uptime-bar mt-1"><div class="uptime-fill" style="width:${fillWidth}%;"></div></div>
          <div class="small-muted mt-1">Avg Latency: ${u.avgLatencyMs ? u.avgLatencyMs + ' ms' : 'n/a'}</div>
        </div>
      </div>
    </div>
  `;
}

function makeTimelineItemHtml(item) {
  const time = new Date(item.timestamp).toLocaleTimeString();
  const ok = item.ok;
  let color = ok ? '#28a745' : (item.statusCode >= 400 && item.statusCode < 500 ? '#ffc107' : '#dc3545');
  const statusCode = item.statusCode ? item.statusCode : 'ERR';
  const latency = item.latencyMs ? `${item.latencyMs} ms` : '--';

  return `
    <div class="timeline-card" style="border-left:4px solid ${color}; padding:8px 10px; margin-bottom:6px; background:rgba(255,255,255,0.03); border-radius:8px;">
      <div class="d-flex justify-content-between align-items-center">
        <div class="fw-bold" style="color:${color};">${statusCode} • ${latency}</div>
        <div class="text-muted small">${time}</div>
      </div>
      <div class="fw-semibold" style="font-size:0.95rem;">${item.name}</div>
      <div class="text-muted small" style="word-break:break-all;">${item.path}</div>
    </div>
  `;
}

async function updateHealthList() {
  const data = await fetchJson('/health/checks');
  if (!data || !data.endpoints) return;
  const container = document.getElementById('healthList');
  container.innerHTML = data.endpoints.map(ep => makeHealthCardHtml(ep)).join('');
}

async function updateUptimeList() {
  const data = await fetchJson('/health/uptime');
  if (!data || !data.endpoints) return;
  const container = document.getElementById('uptimeList');
  container.innerHTML = data.endpoints.map(u => makeUptimeItemHtml(u)).join('');
}

// ===============================================
// Bagian 2: Main Logic (DOMContentLoaded)
// ===============================================
document.addEventListener('DOMContentLoaded', async () => {
  const loadingScreen = document.getElementById("loadingScreen");
  const body = document.body;
  body.classList.add("no-scroll");
  // Inisialisasi Uptime Counter
  const startTime = Date.now();
  setInterval(() => {
    const diff = Date.now() - startTime;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hrs = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    const serverUptimeEl = document.getElementById('serverUptime');
    if (serverUptimeEl) serverUptimeEl.textContent = `${days}d ${hrs}h ${mins}m ${secs}s`;
  }, 1000);
  // === AUTO LOCALIZATION ===
  try {
    const locale = await fetch('/locale').then(res => res.json());
    if (locale.language === 'id') {
      document.documentElement.lang = 'id';
      document.getElementById('searchInput').placeholder = "Cari API...";
      document.querySelectorAll('.category-header')[0].textContent = "Dasbor Statistik";
    }
  } catch (e) {
    console.warn("Gagal mendeteksi bahasa otomatis:", e);
  }

  // === DYNAMIC AI BANNER ===
  const dynamicImage = document.getElementById('dynamicImage');
  if (dynamicImage) {
    async function generateBanner() {
      try {
        const promptList = [
          "futuristic neon cyber cityscape",
          "abstract AI digital art background",
          "portrait of a digital goddess Sayuki",
          "colorful galaxy swirl",
          "dreamy watercolor sunrise"
        ];
        const prompt = promptList[Math.floor(Math.random() * promptList.length)];
        const res = await fetch(`/api/ai/magicstudio?prompt=${encodeURIComponent(prompt)}`);
        const blob = await res.blob();
        dynamicImage.src = URL.createObjectURL(blob);
      } catch (e) {
        console.error("Gagal memuat banner AI:", e);
      }
    }
    generateBanner();
    setInterval(generateBanner, 86400000);
  }

  // === VIDEO BACKGROUND CONTROL ===
  const bgVideo = document.getElementById('bgVideo');
  if (bgVideo) {
    document.addEventListener("readystatechange", () => {
      if (document.readyState !== "complete") {
        bgVideo.pause();
      }
    });
    window.addEventListener("load", () => {
      bgVideo.play().catch(() => console.warn("Autoplay dicegah oleh browser."));
    });
  }

  // === INSIGHT PANEL (NAMA NEGARA + FLAG) ===
  async function updateInsight() {
    try {
      const data = await fetch('/stats/insight').then(res => res.json());
      const el = document.getElementById('insightContent');
      const flagUrl = data.topCountryCode
        ? `https://flagcdn.com/h40/${data.topCountryCode.toLowerCase()}.png`
        : "https://flagcdn.com/h40/un.png";

      el.innerHTML = `
        <div><strong>Total Request:</strong> ${data.totalRequests.toLocaleString()}</div>
        <div><strong>Success Rate:</strong> ${data.successRate}%</div>
        <div><strong>Top Endpoint:</strong> <code>${data.topRoute}</code></div>
        <div class="country-flag-item neon-hover">
          <img src="${flagUrl}" width="30" height="22" class="flag-icon">
          <span class="country-name">${data.topCountryName}</span>
        </div>
      `;
    } catch (err) {
      console.error("Gagal memuat insight:", err);
    }
  }
  setInterval(updateInsight, 5000);
  updateInsight();

  // === GLOBAL MAP VIEW (FLAG + NAMA LENGKAP + NEON ANIMASI) ===
  let worldChart;
  async function updateWorldMap() {
    try {
      const res = await fetch('/stats/live/globalUsage').then(r => r.json());
      const top = res.topCountries || [];
      const labels = top.map(c => c.countryName);
      const values = top.map(c => c.count);

      const ctx = document.getElementById('worldMap').getContext('2d');
      if (worldChart) worldChart.destroy();

      worldChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Top 5 Negara Aktif',
            data: values,
            backgroundColor: 'rgba(0, 255, 255, 0.4)',
            borderColor: '#00eaff',
            borderWidth: 1,
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { labels: { color: '#fff' } },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  const countryName = labels[ctx.dataIndex];
                  const count = ctx.formattedValue;
                  return `${countryName}: ${count} request`;
                }
              }
            }
          },
          scales: {
            x: { ticks: { color: '#fff' } },
            y: { beginAtZero: true, ticks: { color: '#fff' } }
          }
        }
      });

      // === Daftar Bendera Negara ===
      const container = document.getElementById('worldMap').parentElement;
      container.querySelector('.flags-display')?.remove();
      let flagsHtml = '';
      top.forEach(item => {
        const flag = item.countryCode
          ? `https://flagcdn.com/h40/${item.countryCode.toLowerCase()}.png`
          : 'https://flagcdn.com/h40/un.png';
        flagsHtml += `
          <div class="flag-card neon-hover">
            <img src="${flag}" width="50" class="flag-img">
            <div class="country-text">${item.countryName}</div>
            <div class="count-number">${item.count}</div>
          </div>`;
      });
      const flagWrapper = document.createElement('div');
      flagWrapper.className = 'flags-display mt-3 d-flex justify-content-center flex-wrap';
      flagWrapper.innerHTML = flagsHtml;
      container.appendChild(flagWrapper);

    } catch (e) {
      console.warn("Gagal memuat peta global:", e);
    }
  }
  setInterval(updateWorldMap, 5000);
  updateWorldMap();



  try {
    const settings = await fetch('/src/settings.json').then(res => res.json());

    const setContent = (id, property, value) => {
      const el = document.getElementById(id);
      if (el) el[property] = value;
    };

    const modalRefs = {
      label: document.getElementById('apiResponseModalLabel'),
      desc: document.getElementById('apiResponseModalDesc'),
      content: document.getElementById('apiResponseContent'),
      spinner: document.getElementById('apiResponseSpinner'),
      endpoint: document.getElementById('apiEndpoint'),
      inputContainer: document.getElementById('apiQueryInputContainer'), // DEFINISI YANG BENAR
      submitBtn: document.getElementById('submitQueryBtn'),
      codeExample: document.getElementById('apiCodeExample'),
      endpointContainer: document.getElementById('apiEndpointContainer'),
    };
    
    // ---------------------------------------------
    // Fungsi Utama Fetch Statistik & Metrik Gila (Tidak Berubah)
    // ---------------------------------------------
    async function updateStats() {
      try {
        const statsResponse = await fetch('/stats/live').then(res => res.json());
        const perRoute = statsResponse.perRoute || {};
        
        // --- Server Status (Existing) ---
        document.getElementById('serverStatus').textContent = "Online";
        document.getElementById('serverStatus').style.color = "#198754"; 

        // ... (Logika Statistik lainnya) ...
        document.getElementById('totalRequests').textContent = (statsResponse.requests || 0).toLocaleString();
        
        let totalLatency = 0;
        let totalCount = 0;

        const latencyArray = Object.keys(perRoute)
            .filter(route => perRoute[route].count > 0 && perRoute[route].avgLatency !== undefined)
            .map(route => {
                const data = perRoute[route];
                totalLatency += data.avgLatency * data.count;
                totalCount += data.count;
                return { route: route, avgLatency: data.avgLatency };
            });

        const avgGlobalLatency = totalCount > 0 ? (totalLatency / totalCount) : 0;
        const avgLatencyTextEl = document.getElementById('avgLatencyText');
        if(avgLatencyTextEl) avgLatencyTextEl.textContent = `${avgGlobalLatency.toFixed(2)} ms`;
        
        latencyArray.sort((a, b) => a.avgLatency - b.avgLatency);
        
        const fastestRoutes = latencyArray.slice(0, 3);
        const fastestList = document.getElementById('fastestRoutesList');
        
        if (fastestList) {
            fastestList.innerHTML = '<strong>3 Tercepat:</strong>';
            if (fastestRoutes.length > 0) {
                fastestRoutes.forEach(item => {
                    fastestList.innerHTML += `<div class="d-flex justify-content-between small">
                        <span class="text-truncate">${item.route.replace('/endpoint', '')}</span> 
                        <span class="fw-bold">${item.avgLatency.toFixed(0)}ms</span>
                    </div>`;
                });
            } else {
                 fastestList.innerHTML = '<span class="text-muted">No data.</span>';
            }
        }
        
        const serverLoadTime = statsResponse.serverLoadTime || 0; 
        const serverLoadTimeTextEl = document.getElementById('serverLoadTimeText');
        if(serverLoadTimeTextEl) serverLoadTimeTextEl.textContent = `${serverLoadTime.toFixed(2)} ms`;
        
        const totalHits = statsResponse.cache?.totalHits || 0;
        const totalMisses = statsResponse.cache?.totalMisses || 0;
        const totalCacheRequests = totalHits + totalMisses;
        const cacheHitRate = totalCacheRequests > 0 
            ? ((totalHits / totalCacheRequests) * 100).toFixed(1) 
            : 0;
        
        const cacheHitRateTextEl = document.getElementById('cacheHitRateText');
        if(cacheHitRateTextEl) cacheHitRateTextEl.textContent = `${cacheHitRate}%`;
        
        const topParams = statsResponse.topParameters || []; 
        const topParamsList = document.getElementById('topParametersList');
        
        if(topParamsList) {
             topParamsList.innerHTML = '<strong>Top 3 Keys:</strong>';
            if (topParams.length > 0) {
                topParams.slice(0, 3).forEach(item => {
                    topParamsList.innerHTML += `<div class="d-flex justify-content-between small">
                        <span class="text-truncate">${item.name}</span> 
                        <span class="fw-bold">${item.count.toLocaleString()}</span>
                    </div>`;
                });
            } else {
                 topParamsList.innerHTML = '<span class="text-muted">No data.</span>';
            }
        }
       
        const trafficSources = statsResponse.traffic || []; 
        const trafficList = document.getElementById('trafficSourceList');
        
        if(trafficList) {
             trafficList.innerHTML = '<strong>Top 3 Negara:</strong>';
            if (trafficSources.length > 0) {
                trafficSources.slice(0, 3).forEach(item => {
                    trafficList.innerHTML += `<div class="d-flex justify-content-between small">
                        <span class="text-truncate">${item.country}</span> 
                        <span class="fw-bold">${item.count.toLocaleString()}</span>
                    </div>`;
                });
            } else {
                 trafficList.innerHTML = '<span class="text-muted">Memuat...</span>';
            }
        }
        
        const trendData = statsResponse.globalRequestTrend || [0,0,0,0,0,0,0]; 
        const latestCount = trendData[trendData.length - 1] || 0;
        const latestRequestCountEl = document.getElementById('latestRequestCount');
        if(latestRequestCountEl) latestRequestCountEl.textContent = `${latestCount.toLocaleString()} Req Hari Ini`;
        
        const trendContainer = document.getElementById('globalTrendContainer');
        if (trendContainer && trendData.length > 0) {
            const maxVal = Math.max(...trendData);
            trendContainer.innerHTML = trendData.map(val => {
                const height = maxVal > 0 ? (val / maxVal) * 90 : 0;
                return `<div title="${val} Requests" style="height: ${height}%; width: 10%; background: #dc3545; display: inline-block; margin-right: 2px;"></div>`;
            }).join('');
            trendContainer.style.display = 'flex';
            trendContainer.style.alignItems = 'flex-end';
            trendContainer.style.justifyContent = 'space-between';
        } else if (trendContainer) {
            trendContainer.textContent = 'Data trend tidak tersedia.';
        }
        
        let totalErrorCount = statsResponse.error || 0;
        let totalRequestCount = statsResponse.requests || 0;
        
        const globalErrorRate = totalRequestCount > 0 
            ? ((totalErrorCount / totalRequestCount) * 100).toFixed(2) 
            : 0;
            
        const globalErrorRateEl = document.getElementById('globalErrorRate');
        if(globalErrorRateEl) globalErrorRateEl.textContent = `${globalErrorRate}%`;

        const errorArray = Object.keys(perRoute)
            .filter(route => perRoute[route].count > 0 && perRoute[route].error > 0)
            .map(route => {
                const data = perRoute[route];
                const errorRate = (data.error / data.count) * 100;
                return { route: route, errorRate: errorRate };
            });

        errorArray.sort((a, b) => b.errorRate - a.errorRate);
        
        const topErrorRoutes = errorArray.slice(0, 3);
        const errorList = document.getElementById('errorRoutesList');
        
        if (errorList) {
             errorList.innerHTML = '<strong>3 Terburuk:</strong>';
            if (topErrorRoutes.length > 0) {
                topErrorRoutes.forEach(item => {
                    const routeName = item.route.replace('/endpoint', '');
                    errorList.innerHTML += `<div class="d-flex justify-content-between small">
                        <span class="text-danger">${routeName}</span> 
                        <span class="fw-bold">${item.errorRate.toFixed(1)}%</span>
                    </div>`;
                });
            } else {
                 errorList.innerHTML = '<span class="text-success">Tidak ada error tercatat!</span>';
            }
        }
        

      } catch (error) {
        console.error("Gagal mengambil statistik server:", error);
        const serverStatusEl = document.getElementById('serverStatus');
        if(serverStatusEl) {
            serverStatusEl.textContent = "Offline";
            serverStatusEl.style.color = "#dc3545"; 
        }
      }
    }
    
    // Update Stats setiap 3 detik
    setInterval(updateStats, 3000); 
    updateStats();
    
    // ---------------------------------------------
    // Fungsi Utility Pewarnaan JSON (Tidak Berubah)
    // ---------------------------------------------
    function syntaxHighlight(json) {
      if (typeof json != 'string') json = JSON.stringify(json, undefined, 2);
      json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return json.replace(/("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(\.\d*)?([eE][+\-]?\d+)?)/g, match => {
        let cls = 'number';
        if (/^"/.test(match)) cls = /:$/.test(match) ? 'key' : 'string';
        else if (/true|false|null/.test(match)) cls = 'boolean';
        return `<span class="${cls}">${match}</span>`;
      });
    }

    // ---------------------------------------------
    // FUNGSI UTAMA UNTUK MENGIRIM REQUEST API (Tidak Berubah)
    // ---------------------------------------------
    async function handleApiRequest(apiUrl, modalRefs, apiName, method = 'GET', fileInput = null) {
      
      let finalStatus = 'ERR';
      modalRefs.spinner.classList.remove('d-none');
      modalRefs.content.classList.add('d-none');

      // Validasi Parameter Kosong
      if (method === 'GET') {
          const urlObj = new URL(apiUrl);
          let allParamsValid = true;
          for (const [key, value] of urlObj.searchParams.entries()) {
              if (value.trim() === '') { 
                  allParamsValid = false;
                  break;
              }
          }
          if (!allParamsValid) {
              modalRefs.content.innerHTML = syntaxHighlight({ status: false, code: 400, message: "Parameter wajib tidak boleh kosong. Silakan isi semua input." });
              modalRefs.content.classList.remove('d-none');
              modalRefs.spinner.classList.add('d-none');
              return; 
          }
      } else if (method === 'POST' && fileInput && fileInput.files.length === 0) {
          modalRefs.content.innerHTML = syntaxHighlight({ status: false, code: 400, message: "Parameter 'file' wajib diisi. Silakan pilih file untuk diunggah." });
          modalRefs.content.classList.remove('d-none');
          modalRefs.spinner.classList.add('d-none');
          return; 
      }
      

      try {
        let fetchOptions = { method: method };
        let requestUrl = apiUrl;
        
        if (method === 'POST' && fileInput) {
            const formData = new FormData();
            formData.append(fileInput.name, fileInput.files[0]); 
            fetchOptions.body = formData;
            // Untuk POST dengan file, requestUrl harus base URL tanpa query params
            requestUrl = apiUrl.split('?')[0]; 
        }

        const response = await fetch(requestUrl, fetchOptions);
        finalStatus = response.status;
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const contentType = response.headers.get('Content-Type');
        if (contentType && (contentType.startsWith('image/') || contentType.includes('video/') || contentType.includes('audio/'))) {
          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);
          
          if (contentType.startsWith('image/')) {
             modalRefs.content.innerHTML = `<img src="${objectUrl}" alt="${apiName}" style="max-width: 100%; border-radius: 8px;">`;
          } else {
             modalRefs.content.innerHTML = `<a href="${objectUrl}" download="${apiName}-${new Date().getTime()}" class="btn btn-primary w-100"><i class="bi bi-download"></i> Klik untuk Download File</a>`;
          }
        } else {
          const data = await response.json();
          modalRefs.content.innerHTML = syntaxHighlight(data);
        }
        
        modalRefs.content.classList.remove('text-danger');
        modalRefs.content.classList.add('text-success');

      } catch (error) {
        modalRefs.content.textContent = `Error: ${error.message}. Cek koneksi atau URL/Parameter , atau hasil 0`;
        modalRefs.content.classList.remove('text-success');
        modalRefs.content.classList.add('text-danger');
      } finally {
        saveHistory({ path: apiUrl, status: finalStatus, time: new Date().toLocaleTimeString(), });
        updateStats();

        modalRefs.spinner.classList.add('d-none');
        modalRefs.content.classList.remove('d-none');
      }
    }

    // ---------------------------------------------
    // Fungsi Rendering API List & Setup Listener (Tidak Berubah)
    // ---------------------------------------------
    const apiCategoryTabs = document.getElementById('apiCategoryTabs');
    const apiContentArea = document.getElementById('apiContentArea');
    const apiListAll = document.getElementById('apiListAll');
    
    let allApiHtml = '';

    settings.categories.forEach((category) => {
      const categoryId = category.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const sortedItems = category.items.sort((a, b) => a.name.localeCompare(b.name));
      let categoryContent = '';

      // 1. Buat Tab Pill
      const pill = `<li class="nav-item" role="presentation"><button class="nav-link" id="tab-${categoryId}" data-bs-toggle="pill" data-bs-target="#content-${categoryId}" type="button" role="tab" aria-controls="content-${categoryId}">${category.name}</button></li>`;
      apiCategoryTabs.insertAdjacentHTML('beforeend', pill);

      // 2. Buat Tab Pane Container
      const pane = `<div class="tab-pane fade" id="content-${categoryId}" role="tabpanel"><div class="row" id="apiList-${categoryId}"></div></div>`;
      apiContentArea.insertAdjacentHTML('beforeend', pane);

      // 3. Isi Konten (untuk kategori dan 'Semua')
      sortedItems.forEach((item) => {
        const cardHtml = `
          <div class="col-12 col-sm-6 col-lg-4 mb-3 api-item" data-name="${item.name}" data-desc="${item.desc}" data-category="${categoryId}">
            <div class="api-card d-flex flex-column justify-content-between h-100 p-3">
              <div>
                <h5>${item.name}</h5>
                <p class="api-desc">${item.desc}</p>
              </div>
              <button class="btn btn-primary btn-sm mt-auto get-api-btn"
                data-api-path="${item.path}" 
                data-api-name="${item.name}" 
                data-api-desc="${item.desc}"
                data-api-method="${item.method || 'GET'}">
                Request
              </button>
            </div>
          </div>`;
        
        categoryContent += cardHtml;
        allApiHtml += cardHtml; // Tambahkan ke list 'Semua'
      });
      
      document.getElementById(`apiList-${categoryId}`).innerHTML = categoryContent;
    });

    // Isi tab 'Semua'
    apiListAll.innerHTML = allApiHtml;


    // ---------------------------------------------
    // Event Listener (API Modal - FIXED FINAL)
    // ---------------------------------------------
    document.addEventListener('click', event => {
        // FIX 1: Menggunakan .closest() untuk mendeteksi tombol dengan benar
        const targetButton = event.target.closest('.get-api-btn');
        if (!targetButton) return; 

        const { apiPath, apiName, apiDesc, apiMethod } = targetButton.dataset;
        
        // Memastikan Bootstrap Modal tersedia
        if (typeof bootstrap === 'undefined' || !bootstrap.Modal) {
            console.error("Bootstrap JS Modal component not found. Check if the script is loaded.");
            return;
        }
        
        const modal = new bootstrap.Modal(document.getElementById('apiResponseModal'));
        
        // Reset Modal State
        modalRefs.label.textContent = apiName;
        modalRefs.desc.textContent = apiDesc;
        modalRefs.content.innerHTML = '';
        modalRefs.spinner.classList.add('d-none'); 
        modalRefs.content.classList.add('d-none'); 
        
        // FIX 2: MENGGANTI queryInputContainer MENJADI inputContainer
        if(modalRefs.inputContainer) modalRefs.inputContainer.innerHTML = ''; 
        
        modalRefs.submitBtn.classList.remove('d-none'); 
        modalRefs.submitBtn.textContent = 'Request';

        const responseTabEl = document.getElementById('response-tab');
        if (responseTabEl) responseTabEl.click();

        let baseApiUrl = `${window.location.origin}${apiPath.split('?')[0]}`;
        const urlParamsString = apiPath.split('?')[1] || '';
        const codeMethod = apiMethod.toUpperCase();
        
        let isFileUpload = false;
        let fileInputEl = null; 
        
        
        // Setup Inputs
        if (urlParamsString || codeMethod === 'POST') {
            
            // Setup parameter inputs for GET
            if (urlParamsString) {
                const currentParams = new URLSearchParams(urlParamsString);
                currentParams.forEach((value, key) => {
                    // FIX 3: MENGGANTI queryInputContainer MENJADI inputContainer
                    if(modalRefs.inputContainer) modalRefs.inputContainer.insertAdjacentHTML('beforeend', `
                        <label class="form-label small mb-1">${key} *</label>
                        <input type="text" class="form-control form-control-sm mb-2 query-param-input" 
                               data-param-key="${key}" placeholder="e.g. ${value}" value="${decodeURIComponent(value)}">
                    `);
                });
            }

            // Setup file input for POST
            if (codeMethod === 'POST') {
                isFileUpload = true;
                const fileInputHtml = `
                    <label class="form-label small mb-1">fileToUpload *</label>
                    <input type="file" class="form-control form-control-sm mb-2 file-input-element" name="fileToUpload">
                `;
                 // FIX 4: MENGGANTI queryInputContainer MENJADI inputContainer
                if(modalRefs.inputContainer) modalRefs.inputContainer.insertAdjacentHTML('beforeend', fileInputHtml);
                 // FIX 5: MENGGANTI queryInputContainer MENJADI inputContainer
                fileInputEl = modalRefs.inputContainer ? modalRefs.inputContainer.querySelector('.file-input-element') : null;
            }

            // Function to update endpoint displayed in modal footer
            const updateEndpointDisplay = () => {
                 // FIX 6: MENGGANTI queryInputContainer MENJADI inputContainer
                const paramInputs = modalRefs.inputContainer ? modalRefs.inputContainer.querySelectorAll('.query-param-input') : [];
                const tempParams = new URLSearchParams();

                // Collect current parameter values
                paramInputs.forEach(input => {
                    const key = input.dataset.paramKey;
                    const value = input.value.trim();
                    if (value) {
                        tempParams.set(key, value);
                    }
                });
                
                // Update display
                const finalEndpoint = isFileUpload 
                    ? `${codeMethod} ${baseApiUrl}` 
                    : `${baseApiUrl}?${tempParams.toString()}`;
                
                modalRefs.endpoint.textContent = finalEndpoint;

                // Update code example based on current inputs
                const finalCodePath = isFileUpload ? baseApiUrl : `${baseApiUrl}?${tempParams.toString()}`;
                const codeCurl = `curl -X '${codeMethod}' \\\n  '${finalCodePath}'`;
                const codeFetch = `fetch('${finalCodePath}', { method: '${codeMethod}' })\n  .then(res => res.json())\n  .then(data => console.log(data));`;
                modalRefs.codeExample.textContent = `// cURL\n${codeCurl}\n\n// JavaScript Fetch\n${codeFetch}`;
            };

            // Add event listeners to input fields
            // FIX 7: MENGGANTI queryInputContainer MENJADI inputContainer
            if(modalRefs.inputContainer) {
                modalRefs.inputContainer.querySelectorAll('input').forEach(input => {
                    input.addEventListener('input', updateEndpointDisplay);
                    if (input.type === 'file') {
                        input.addEventListener('change', updateEndpointDisplay);
                    }
                });
            }
            
            // Initial call to display correct endpoint
            updateEndpointDisplay();

            // Set Submit button action
            modalRefs.submitBtn.onclick = () => {
                 // FIX 8: MENGGANTI queryInputContainer MENJADI inputContainer
                const paramInputs = modalRefs.inputContainer ? modalRefs.inputContainer.querySelectorAll('.query-param-input') : [];
                const tempParams = new URLSearchParams();

                paramInputs.forEach(input => {
                    const key = input.dataset.paramKey;
                    const value = input.value.trim();
                    if (value) tempParams.set(key, value);
                });
                
                const finalUrl = `${baseApiUrl}?${tempParams.toString()}`;
                handleApiRequest(finalUrl, modalRefs, apiName, codeMethod, fileInputEl);
            };

        } else {
            // Case: API requires NO parameters (Simple GET)
            modalRefs.endpoint.textContent = baseApiUrl;
            // FIX 9: MENGGANTI queryInputContainer MENJADI inputContainer
            if(modalRefs.inputContainer) modalRefs.inputContainer.innerHTML = '<p class="text-secondary small">Endpoint ini tidak memerlukan parameter.</p>';
            modalRefs.submitBtn.onclick = () => handleApiRequest(baseApiUrl, modalRefs, apiName, codeMethod);
            
            // Update code example for non-parameterized API
            const finalCodePath = baseApiUrl;
            const codeCurl = `curl -X '${codeMethod}' \\\n  '${finalCodePath}'`;
            const codeFetch = `fetch('${finalCodePath}', { method: '${codeMethod}' })\n  .then(res => res.json())\n  .then(data => console.log(data));`;
            modalRefs.codeExample.textContent = `// cURL\n${codeCurl}\n\n// JavaScript Fetch\n${codeFetch}`;
        }
        
        // Menampilkan modal
        modal.show();

    });
    
    // Copy Code (Tidak Berubah)
    const copyCodeBtnEl = document.getElementById('copyCodeBtn');
    if (copyCodeBtnEl) {
        copyCodeBtnEl.addEventListener('click', () => {
            const codeText = modalRefs.codeExample.textContent;
            navigator.clipboard.writeText(codeText).then(() => {
                copyCodeBtnEl.textContent = 'Copied!';
                setTimeout(() => { copyCodeBtnEl.textContent = 'Copy'; }, 800);
            });
        });
    }

    // Copy Endpoint di Modal Footer (Tidak Berubah)
    if (modalRefs.endpointContainer) {
        modalRefs.endpointContainer.addEventListener('click', () => {
            const endpoint = modalRefs.endpoint.textContent;
            if (endpoint) {
                navigator.clipboard.writeText(endpoint).then(() => {
                    const originalText = modalRefs.endpoint.textContent;
                    modalRefs.endpoint.textContent = 'Copied!';
                    setTimeout(() => {
                        modalRefs.endpoint.textContent = originalText;
                    }, 800);
                });
            }
        });
    }
    
    // Search Listener (Filter Cards) (Tidak Berubah)
    const searchInputEl = document.getElementById('searchInput');
    if (searchInputEl) {
        searchInputEl.addEventListener('input', function() {
            const query = this.value.toLowerCase();
            document.querySelectorAll('.api-item').forEach(item => {
                const name = item.getAttribute('data-name').toLowerCase();
                const desc = item.getAttribute('data-desc').toLowerCase();
                item.style.display = (name.includes(query) || desc.includes(query)) ? '' : 'none';
            });
        });
    }


    // ---------------------------------------------
    // Initial Load (Tidak Berubah)
    // ---------------------------------------------
    setContent('page', 'textContent', settings.name || "API Dashboard");
    setContent('header', 'textContent', settings.name || "API Dashboard");
    setContent('name', 'textContent', settings.name || "API Dashboard");
    setContent('version', 'textContent', settings.version || "v1.0 Beta");
    setContent('versionHeader', 'textContent', settings.header.status || "Online!");
    setContent('description', 'textContent', settings.description || "Simple API's");

    const dynamicImage = document.getElementById('dynamicImage');
    if (dynamicImage) {
      const randomImageSrc = Array.isArray(settings.header.imageSrc) && settings.header.imageSrc.length > 0
        ? settings.header.imageSrc[Math.floor(Math.random() * settings.header.imageSrc.length)]
        : "";
      dynamicImage.src = randomImageSrc;
    }
    
    const totalApi = settings.categories.reduce((sum, cat) => sum + cat.items.length, 0);
    document.getElementById('totalApi').textContent = totalApi;

    renderHistory();

  } catch (error) {
    console.error("Error loading settings or rendering content:", error);
  } finally {
    setTimeout(() => {
      loadingScreen.style.display = "none";
      body.classList.remove("no-scroll");
    }, 500);
  }
});