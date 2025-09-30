class CryptoApp {
  constructor() {
    this.apiBase = 'https://api.coingecko.com/api/v3';
    this.symbolMap = {
      btc: 'bitcoin', eth: 'ethereum', bnb: 'binancecoin', sol: 'solana',
      doge: 'dogecoin', ada: 'cardano', xrp: 'ripple', dot: 'polkadot',
      matic: 'matic-network', shib: 'shiba-inu', ltc: 'litecoin', link: 'chainlink'
    };
    this.defaultCoins = ['bitcoin', 'ethereum', 'binancecoin', 'solana', 'dogecoin'];
    this._cache = {}; // in-memory cache { key: { ts, data } }
    this._cacheTTL = 60 * 1000; // 60s cache for markets responses
    this._chartConcurrency = 3; // limit concurrent chart fetches
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupThemeToggle();
    this.loadDefaultCoins();
  }

  // ---------------- DOM wiring ----------------
  setupEventListeners() {
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');

    if (searchBtn) searchBtn.addEventListener('click', () => this.handleSearch());
    if (searchInput) searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleSearch();
    });

    this.setupNavigation();
  }

  setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link') || [];
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-link') || [];
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const mobileNav = document.getElementById('mobileNav');

    // Desktop links
    if (navLinks.length) {
      navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          navLinks.forEach(l => l.classList.remove('active'));
          link.classList.add('active');
          const href = link.getAttribute('href');
          this.scrollToSection(href);
        });
      });
    }

    // Mobile links (if exist)
    if (mobileNavLinks.length) {
      mobileNavLinks.forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          navLinks.forEach(l => l.classList.remove('active'));
          mobileNavLinks.forEach(l => l.classList.remove('active'));
          link.classList.add('active');
          const href = link.getAttribute('href');
          const correspondingDesktopLink = document.querySelector(`.nav-link[href="${href}"]`);
          if (correspondingDesktopLink) correspondingDesktopLink.classList.add('active');
          this.closeMobileMenu();
          this.scrollToSection(href);
        });
      });
    }

    if (mobileMenuToggle) {
      mobileMenuToggle.addEventListener('click', () => this.toggleMobileMenu());
      // clicking outside to close
      document.addEventListener('click', (e) => {
        if (!mobileNav) return;
        if (!mobileNav.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
          this.closeMobileMenu();
        }
      });
    }
  }

  scrollToSection(href) {
    if (!href) return;
    const targetId = href.startsWith('#') ? href.substring(1) : href;
    const target = document.getElementById(targetId) || document.querySelector(`.${targetId}-section`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (targetId === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (targetId === 'search') {
      const s = document.querySelector('.search-section');
      if (s) s.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  toggleMobileMenu() {
    const mobileNav = document.getElementById('mobileNav');
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    if (!mobileNav || !mobileMenuToggle) return;
    const toggleIcon = mobileMenuToggle.querySelector('i');
    mobileNav.classList.toggle('active');
    mobileMenuToggle.classList.toggle('active');
    if (toggleIcon) toggleIcon.className = mobileNav.classList.contains('active') ? 'fas fa-times' : 'fas fa-bars';
  }

  closeMobileMenu() {
    const mobileNav = document.getElementById('mobileNav');
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    if (!mobileNav || !mobileMenuToggle) return;
    const toggleIcon = mobileMenuToggle.querySelector('i');
    mobileNav.classList.remove('active');
    mobileMenuToggle.classList.remove('active');
    if (toggleIcon) toggleIcon.className = 'fas fa-bars';
  }

  // ---------------- Theme ----------------
  setupThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const saved = localStorage.getItem('theme') || 'light';
    this.setTheme(saved);
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const next = current === 'light' ? 'dark' : 'light';
        this.setTheme(next);
      });
    }
  }

  setTheme(theme) {
    const themeIcon = document.getElementById('themeIcon');
    const themeText = document.getElementById('themeText');
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    if (themeIcon) themeIcon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    if (themeText) themeText.textContent = theme === 'dark' ? 'Dark' : 'Light';
    // redraw placeholders if present
    const canvases = document.querySelectorAll('.chart-canvas');
    canvases.forEach(c => {
      const hasData = !!(c.dataset && c.dataset.prices);
      if (!hasData) this.showChartPlaceholder(c.id);
    });
  }

  // ---------------- Search & top-level loading ----------------
  async handleSearch() {
    const inputEl = document.getElementById('searchInput');
    if (!inputEl) return;
    const raw = (inputEl.value || '').trim();
    if (!raw) return;

    this.showLoading();
    this.hideError();

    const q = raw.toLowerCase();

    // quick symbol mapping first
    if (this.symbolMap[q]) {
      await this.loadSpecificCoin(this.symbolMap[q]);
      this.hideLoading();
      return;
    }

    // Attempt CoinGecko search
    try {
      const searchUrl = `${this.apiBase}/search?query=${encodeURIComponent(raw)}`;
      const res = await this._fetchWithTimeout(searchUrl, { cache: 'no-store' }, 8000);
      if (!res.ok) {
        this._handleFetchStatus(res.status);
        return;
      }
      const data = await res.json();
      if (data && Array.isArray(data.coins) && data.coins.length) {
        // prefer exact symbol or id
        const exactSymbol = data.coins.find(c => c.symbol && c.symbol.toLowerCase() === q);
        const exactId = data.coins.find(c => c.id && c.id.toLowerCase() === q);
        const chosen = exactSymbol || exactId || data.coins[0];
        if (chosen && chosen.id) {
          await this.loadSpecificCoin(chosen.id);
        } else {
          this.showError(`Coin "${raw}" not found on CoinGecko. Please try full name or symbol.`);
        }
      } else {
        this.showError(`Coin "${raw}" not found on CoinGecko. Please try full name or symbol.`);
      }
    } catch (err) {
      if (!navigator.onLine) this.showError('No internet connection. Please check your connection and reload the page.');
      else this.showError('Failed to search cryptocurrency. Please reload the page.');
    } finally {
      this.hideLoading();
    }
  }

  async loadDefaultCoins() {
    this.showLoading();
    this.hideError();
    try {
      await this.loadCoins(this.defaultCoins);
    } catch (err) {
      if (!navigator.onLine) this.showError('No internet connection. Please check your connection and reload the page.');
      else this.showError('Failed to load default coins. Please reload the page.');
    } finally {
      this.hideLoading();
    }
  }

  async loadSpecificCoin(coinId) {
    if (!coinId) {
      this.showError('Invalid coin requested. Please try again.');
      return;
    }
    this.showLoading();
    this.hideError();
    try {
      await this.loadCoins([coinId]);
    } catch (err) {
      if (!navigator.onLine) this.showError('No internet connection. Please check your connection and reload the page.');
      else this.showError(`Failed to load data for "${coinId}". Please reload the page.`);
    } finally {
      this.hideLoading();
    }
  }

  // ---------------- Markets + chart orchestration ----------------
  async loadCoins(coinIds) {
    if (!Array.isArray(coinIds) || coinIds.length === 0) return;

    // Use sparkline=true to get sparkline data in the markets response (reduces extra chart calls)
    const coinIdsString = coinIds.join(',');
    const marketsUrl = `${this.apiBase}/coins/markets?vs_currency=usd&ids=${encodeURIComponent(coinIdsString)}&order=market_cap_desc&per_page=10&page=1&sparkline=true&price_change_percentage=24h`;

    // caching
    const cacheKey = `markets:${coinIdsString}`;
    const cached = this._getCache(cacheKey);
    let coins;
    try {
      if (cached) coins = cached;
      else {
        const res = await this._fetchWithTimeout(marketsUrl, { cache: 'no-store' }, 8000);
        if (!res.ok) {
          this._handleFetchStatus(res.status);
          return;
        }
        coins = await res.json();
        if (!Array.isArray(coins) || coins.length === 0) {
          this.showError('No market data returned. The coin may not exist on CoinGecko.');
          return;
        }
        this._setCache(cacheKey, coins);
      }
    } catch (err) {
      if (!navigator.onLine) this.showError('No internet connection. Please check your connection and reload the page.');
      else this.showError('Failed to fetch market data. Please reload the page.');
      return;
    }

    const gridEl = document.getElementById('cryptoGrid');
    if (!gridEl) return;
    gridEl.innerHTML = '';

    // Build chart map: try to use sparkline_in_7d when present
    const chartMap = {};
    const needsChart = [];
    for (const coin of coins) {
      if (coin && coin.id && coin.sparkline_in_7d && Array.isArray(coin.sparkline_in_7d.price) && coin.sparkline_in_7d.price.length) {
        // convert sparkline 7d array to ~24 points over last 24 hours
        chartMap[coin.id] = this._sparklineTo24h(coin.sparkline_in_7d.price);
      } else {
        needsChart.push(coin);
      }
    }

    // Fetch missing charts with concurrency limit
    if (needsChart.length) {
      const chartsFetched = await this._fetchChartsConcurrently(needsChart, this._chartConcurrency);
      for (const id in chartsFetched) {
        chartMap[id] = chartsFetched[id]; // may be fallback or chart data
      }
    }

    // Create card for each coin with chartMap[coin.id]
    for (const coin of coins) {
      try {
        await this.createCoinCard(coin, chartMap[coin.id]);
      } catch (e) {
        // keep UI stable: minimal placeholder
        const fallback = document.createElement('div');
        fallback.className = 'crypto-card error-card';
        fallback.innerHTML = `
          <div class="crypto-header"><div class="crypto-info"><h3>${coin?.name || coin?.id || 'Unknown'}</h3><div class="crypto-symbol">${(coin?.symbol || '').toUpperCase()}</div></div></div>
          <div class="crypto-error">Data unavailable. Please reload the page.</div>
        `;
        gridEl.appendChild(fallback);
      }
    }
  }

  // Turn sparkline 7d price array into approximately 24 hourly points for the last day.
  _sparklineTo24h(sparklinePrices) {
    // sparklinePrices is ordered oldest -> newest over 7 days
    const total = sparklinePrices.length;
    if (!total) return [];
    // pick last ~24 equally spaced samples from the tail
    const startIndex = Math.max(0, total - 96); // sometimes sparkline has many points; we sample from last part
    const tail = sparklinePrices.slice(startIndex);
    const samples = 24;
    const step = Math.max(1, Math.floor(tail.length / samples));
    const prices = [];
    const now = Date.now();
    const hourMs = 60 * 60 * 1000;
    const baseTimestamp = now - (samples - 1) * hourMs;
    for (let i = 0; i < samples; i++) {
      const idx = Math.min(tail.length - 1, i * step);
      prices.push([baseTimestamp + i * hourMs, Number(tail[idx])]);
    }
    return prices;
  }

  // Fetch charts for coins with concurrency limit
  async _fetchChartsConcurrently(coins, concurrency = 3) {
    const results = {};
    let i = 0;
    const workers = new Array(Math.min(concurrency, coins.length)).fill(null).map(async () => {
      while (i < coins.length) {
        const index = i++;
        const coin = coins[index];
        if (!coin || !coin.id) continue;
        const url = `${this.apiBase}/coins/${coin.id}/market_chart?vs_currency=usd&days=1`;
        try {
          const res = await this._fetchWithTimeout(url, { cache: 'no-store' }, 8000);
          if (res && res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.prices) && data.prices.length) {
              results[coin.id] = data.prices;
              continue;
            }
          }
          // if we get here, either not ok or malformed -> fallback generated
          results[coin.id] = this._generateFallbackSeries(coin);
        } catch (err) {
          // network or timeout -> fallback
          results[coin.id] = this._generateFallbackSeries(coin);
        }
      }
    });
    await Promise.all(workers);
    return results;
  }

  _generateFallbackSeries(coin) {
    const currentPrice = typeof coin.current_price === 'number' ? coin.current_price : 0;
    const change = (typeof coin.price_change_percentage_24h === 'number') ? (coin.price_change_percentage_24h / 100) : 0;
    const startPrice = (currentPrice === 0 || !isFinite(1 + change)) ? currentPrice : (currentPrice / (1 + change));
    const prices = [];
    for (let j = 0; j < 24; j++) {
      const timestamp = Date.now() - (23 - j) * 60 * 60 * 1000;
      const progress = j / 23;
      const noise = (Math.random() - 0.5) * currentPrice * 0.02;
      const p = startPrice + (currentPrice - startPrice) * progress + noise;
      prices.push([timestamp, Number(p)]);
    }
    return prices;
  }

  // ---------------- Card & chart drawing ----------------
  async createCoinCard(coin, chartPrices = null) {
    if (!coin || !coin.id) throw new Error('Invalid coin');
    const grid = document.getElementById('cryptoGrid');
    if (!grid) throw new Error('#cryptoGrid not found');

    const change24 = typeof coin.price_change_percentage_24h === 'number' ? coin.price_change_percentage_24h : 0;
    const changeClass = change24 >= 0 ? 'change-positive' : 'change-negative';
    const changeIcon = change24 >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';

    const card = document.createElement('div');
    card.className = 'crypto-card';
    card.innerHTML = `
      <div class="crypto-header">
        <img src="${coin.image || ''}" alt="${coin.name}" class="crypto-logo" onerror="this.style.visibility='hidden'">
        <div class="crypto-info"><h3>${coin.name}</h3><div class="crypto-symbol">${(coin.symbol || '').toUpperCase()}</div></div>
      </div>

      <div class="crypto-price">$${this.formatNumber(coin.current_price)}</div>

      <div class="crypto-stats">
        <div class="stat"><div class="stat-label">Market Cap</div><div class="stat-value">$${this.formatLargeNumber(coin.market_cap)}</div></div>
        <div class="stat"><div class="stat-label">24h Change</div><div class="stat-value ${changeClass}"><i class="fas ${changeIcon}"></i> ${Math.abs(change24).toFixed(2)}%</div></div>
      </div>

      <div class="chart-container">
        <canvas class="chart-canvas" id="chart-${coin.id}"></canvas>
      </div>

      <a href="https://www.coingecko.com/en/coins/${coin.id}" target="_blank" rel="noopener noreferrer" class="view-more-btn">
        <i class="fas fa-external-link-alt"></i> View More on CoinGecko
      </a>
    `;

    grid.appendChild(card);

    // Draw chart: use provided chartPrices; if missing fallback generated series
    let prices = chartPrices;
    if (!Array.isArray(prices) || prices.length === 0) {
      prices = this._generateFallbackSeries(coin);
    }

    const canvas = document.getElementById(`chart-${coin.id}`);
    if (canvas && Array.isArray(prices) && prices.length > 0) {
      try {
        canvas.dataset.prices = JSON.stringify(prices);
        canvas.dataset.positive = (change24 >= 0).toString();
      } catch (e) {
        // ignore
      }
      this.drawChart(`chart-${coin.id}`, prices, change24 >= 0);
    } else if (canvas) {
      this.showChartPlaceholder(`chart-${coin.id}`);
    }
  }

  drawChart(canvasId, prices, isPositive) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rectW = canvas.offsetWidth || 400;
    const rectH = canvas.offsetHeight || 120;
    canvas.width = Math.max(1, rectW * dpr);
    canvas.height = Math.max(1, rectH * dpr);
    canvas.style.width = rectW + 'px';
    canvas.style.height = rectH + 'px';

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    if (!Array.isArray(prices) || prices.length === 0) {
      this.showChartPlaceholder(canvasId);
      return;
    }

    const cleaned = prices.filter(p => Array.isArray(p) && p.length >= 2 && isFinite(p[1]));
    if (cleaned.length === 0) {
      this.showChartPlaceholder(canvasId);
      return;
    }

    const width = rectW;
    const height = rectH;
    const padding = 10;

    ctx.clearRect(0, 0, width, height);

    const priceValues = cleaned.map(p => p[1]);
    const minPrice = Math.min(...priceValues);
    const maxPrice = Math.max(...priceValues);
    const priceRange = (maxPrice - minPrice) || 1;

    const lineColor = isPositive ? '#22c55e' : '#ef4444';
    const gradientColor = isPositive ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)';
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, gradientColor);
    gradient.addColorStop(1, 'rgba(255,255,255,0)');

    // area
    ctx.beginPath();
    for (let i = 0; i < cleaned.length; i++) {
      const x = padding + (i / (cleaned.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((cleaned[i][1] - minPrice) / priceRange) * (height - 2 * padding);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineTo(width - padding, height - padding);
    ctx.lineTo(padding, height - padding);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // line
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = lineColor;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (let i = 0; i < cleaned.length; i++) {
      const x = padding + (i / (cleaned.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((cleaned[i][1] - minPrice) / priceRange) * (height - 2 * padding);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.save();
    ctx.shadowColor = lineColor;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.restore();
  }

  showChartPlaceholder(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const rectW = canvas.offsetWidth || 400;
    const rectH = canvas.offsetHeight || 120;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rectW * dpr;
    canvas.height = rectH * dpr;
    canvas.style.width = rectW + 'px';
    canvas.style.height = rectH + 'px';
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    const bgColor = theme === 'dark' ? '#222' : '#f4f6fb';
    const textColor = theme === 'dark' ? '#999' : '#6b7280';

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, rectW, rectH);

    ctx.fillStyle = textColor;
    ctx.font = '13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Chart data unavailable', rectW / 2, rectH / 2);
  }

  // ---------------- Helpers ----------------
  formatNumber(num) {
    if (num == null || !isFinite(num)) return '-';
    if (num >= 1) return Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 });
    return Number(num).toFixed(6);
  }

  formatLargeNumber(num) {
    if (num == null || !isFinite(num)) return '-';
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return Number(num).toLocaleString();
  }

  showLoading() {
    const el = document.getElementById('loading');
    if (el) el.style.display = 'block';
  }

  hideLoading() {
    const el = document.getElementById('loading');
    if (el) el.style.display = 'none';
  }

  showError(message) {
    const errorElement = document.getElementById('errorMessage');
    if (!errorElement) {
      alert(message);
      return;
    }
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  }

  hideError() {
    const errorElement = document.getElementById('errorMessage');
    if (errorElement) errorElement.style.display = 'none';
  }

  // ---------------- small utilities ----------------
  _getCache(key) {
    const e = this._cache[key];
    if (!e) return null;
    if ((Date.now() - e.ts) > this._cacheTTL) {
      delete this._cache[key];
      return null;
    }
    return e.data;
  }
  _setCache(key, data) {
    try { this._cache[key] = { ts: Date.now(), data }; } catch (e) {}
  }

  _handleFetchStatus(status) {
    if (!navigator.onLine) this.showError('No internet connection. Please check your connection and reload the page.');
    else if (status === 429) this.showError('CoinGecko rate limit reached. Please wait a minute and reload the page.');
    else if (status >= 500) this.showError('CoinGecko API unavailable. Please reload the page later.');
    else if (status === 404) this.showError('Coin not found on CoinGecko.');
    else this.showError(`Failed to fetch market data (status ${status}). Please reload the page.`);
  }

  // small fetch wrapper with timeout
  async _fetchWithTimeout(url, opts = {}, timeout = 8000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(url, Object.assign({}, opts, { signal: controller.signal }));
      clearTimeout(id);
      return res;
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new CryptoApp();
});
