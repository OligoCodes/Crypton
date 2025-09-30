class CryptoApp {
    constructor() {
        this.apiBase = 'https://api.coingecko.com/api/v3';
        this.defaultCoins = ['bitcoin', 'ethereum', 'binancecoin', 'solana', 'dogecoin'];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupThemeToggle();
        this.loadDefaultCoins();
    }

    setupEventListeners() {
        const searchBtn = document.getElementById('searchBtn');
        const searchInput = document.getElementById('searchInput');

        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.handleSearch());
        }
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleSearch();
            });
        }

        // Navigation functionality
        this.setupNavigation();
    }

    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        const mobileNav = document.getElementById('mobileNav');

        // If mobile menu or nav items aren't present, skip wiring them
        if (!navLinks || !mobileNavLinks || !mobileMenuToggle || !mobileNav) return;

        // Desktop navigation
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();

                // Remove active class from all links
                navLinks.forEach(l => l.classList.remove('active'));
                mobileNavLinks.forEach(l => l.classList.remove('active'));

                // Add active class to clicked link
                link.classList.add('active');

                // Find corresponding mobile link and activate it
                const href = link.getAttribute('href');
                const correspondingMobileLink = document.querySelector(`.mobile-nav-link[href="${href}"]`);
                if (correspondingMobileLink) {
                    correspondingMobileLink.classList.add('active');
                }

                this.scrollToSection(href);
            });
        });

        // Mobile navigation
        mobileNavLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();

                // Remove active class from all links
                navLinks.forEach(l => l.classList.remove('active'));
                mobileNavLinks.forEach(l => l.classList.remove('active'));

                // Add active class to clicked link
                link.classList.add('active');

                // Find corresponding desktop link and activate it
                const href = link.getAttribute('href');
                const correspondingDesktopLink = document.querySelector(`.nav-link[href="${href}"]`);
                if (correspondingDesktopLink) {
                    correspondingDesktopLink.classList.add('active');
                }

                // Close mobile menu
                this.closeMobileMenu();

                this.scrollToSection(href);
            });
        });

        // Mobile menu toggle
        mobileMenuToggle.addEventListener('click', () => {
            this.toggleMobileMenu();
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!mobileNav.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
                this.closeMobileMenu();
            }
        });
    }

    scrollToSection(href) {
        if (!href) return;
        const targetId = href.substring(1);
        const targetSection = document.getElementById(targetId) || document.querySelector(`.${targetId}-section`);

        if (targetSection) {
            targetSection.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        } else if (targetId === 'home') {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        } else if (targetId === 'search') {
            const searchSection = document.querySelector('.search-section');
            if (searchSection) {
                searchSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    toggleMobileMenu() {
        const mobileNav = document.getElementById('mobileNav');
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        if (!mobileNav || !mobileMenuToggle) return;

        const toggleIcon = mobileMenuToggle.querySelector('i');

        mobileNav.classList.toggle('active');
        mobileMenuToggle.classList.toggle('active');

        // Change icon safely
        if (toggleIcon) {
            toggleIcon.className = mobileNav.classList.contains('active') ? 'fas fa-times' : 'fas fa-bars';
        }
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

    setupThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        if (!themeToggle) return;

        const savedTheme = localStorage.getItem('theme') || 'light';
        this.setTheme(savedTheme);

        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            this.setTheme(newTheme);
        });
    }

    setTheme(theme) {
        const themeIcon = document.getElementById('themeIcon');
        const themeText = document.getElementById('themeText');

        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);

        if (themeIcon) themeIcon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
        if (themeText) themeText.textContent = theme === 'dark' ? 'Dark' : 'Light';

        // redraw placeholders if necessary
        this.redrawPlaceholders();
    }

    // small helper to repaint placeholders after theme change
    redrawPlaceholders() {
        const canvases = document.querySelectorAll('.chart-canvas');
        canvases.forEach(c => {
            // if canvas has no data, re-draw placeholder to pick up new theme
            const hasData = c.dataset && c.dataset.prices;
            if (!hasData) this.showChartPlaceholder(c.id);
        });
    }

    // ------------ Search & Loading -------------
    async handleSearch() {
        const input = document.getElementById('searchInput');
        if (!input) return;
        const query = input.value.trim();
        if (!query) return;

        this.showLoading();
        this.hideError();

        try {
            const searchUrl = `${this.apiBase}/search?query=${encodeURIComponent(query)}`;
            const searchData = await this._safeFetchJson(searchUrl);
            if (searchData && Array.isArray(searchData.coins) && searchData.coins.length > 0) {
                // prefer exact symbol match (user likely typed BTC, ETH)
                const q = query.toLowerCase();
                const exactBySymbol = searchData.coins.find(c => c.symbol && c.symbol.toLowerCase() === q);
                const exactById = searchData.coins.find(c => c.id && c.id.toLowerCase() === q);
                const chosen = exactBySymbol || exactById || searchData.coins[0];
                await this.loadSpecificCoin(chosen.id);
            } else {
                this.showError(`No cryptocurrency found for "${query}". Please try full name or symbol. Please reload the page.`);
            }
        } catch (err) {
            this.showError('Error searching cryptocurrency. Please reload the page.');
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
            this.showError('Error loading default coins. Please reload the page.');
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
            this.showError(`Error loading data for "${coinId}". Please reload the page.`);
        } finally {
            this.hideLoading();
        }
    }

    async loadCoins(coinIds) {
        if (!coinIds || coinIds.length === 0) return;

        const grid = document.getElementById('cryptoGrid');
        if (!grid) return;

        const coinIdsString = coinIds.join(',');
        const marketsUrl = `${this.apiBase}/coins/markets?vs_currency=usd&ids=${encodeURIComponent(coinIdsString)}&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h`;

        let coins;
        try {
            coins = await this._safeFetchJson(marketsUrl);
        } catch (err) {
            this.showError('Error fetching market data. Please reload the page.');
            return;
        }

        if (!Array.isArray(coins) || coins.length === 0) {
            this.showError('No market data returned. The coin may not exist on CoinGecko. Please reload the page.');
            return;
        }

        // Clear existing content
        grid.innerHTML = '';

        for (const coin of coins) {
            // keep creating cards even if one fails
            try {
                await this.createCoinCard(coin);
            } catch (err) {
                // create a lightweight placeholder card so UI remains stable
                const fallback = document.createElement('div');
                fallback.className = 'crypto-card error-card';
                fallback.innerHTML = `
                    <div class="crypto-header">
                        <div class="crypto-info">
                            <h3>${coin?.name || coin?.id || 'Unknown'}</h3>
                            <div class="crypto-symbol">${(coin?.symbol || '').toUpperCase()}</div>
                        </div>
                    </div>
                    <div class="crypto-error">Data unavailable. Please reload the page.</div>
                `;
                grid.appendChild(fallback);
            }
        }
    }

    // ------------ Card & Chart -------------
    async createCoinCard(coin) {
        if (!coin || !coin.id) throw new Error('Invalid coin object');

        const grid = document.getElementById('cryptoGrid');
        if (!grid) throw new Error('#cryptoGrid not found');

        const card = document.createElement('div');
        card.className = 'crypto-card';

        const name = coin.name || coin.id;
        const symbol = (coin.symbol || '').toUpperCase();
        const image = coin.image || '';
        const price = coin.current_price != null ? this.formatNumber(coin.current_price) : '-';
        const marketCap = coin.market_cap != null ? this.formatLargeNumber(coin.market_cap) : '-';
        const change24 = coin.price_change_percentage_24h != null ? coin.price_change_percentage_24h : 0;
        const changeClass = change24 >= 0 ? 'change-positive' : 'change-negative';
        const changeIcon = change24 >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';

        card.innerHTML = `
            <div class="crypto-header">
                <img src="${image}" alt="${name} logo" class="crypto-logo" onerror="this.style.visibility='hidden'">
                <div class="crypto-info">
                    <h3>${name}</h3>
                    <div class="crypto-symbol">${symbol}</div>
                </div>
            </div>

            <div class="crypto-price">$${price}</div>

            <div class="crypto-stats">
                <div class="stat">
                    <div class="stat-label">Market Cap</div>
                    <div class="stat-value">$${marketCap}</div>
                </div>
                <div class="stat">
                    <div class="stat-label">24h Change</div>
                    <div class="stat-value ${changeClass}">
                        <i class="fas ${changeIcon}"></i>
                        ${Math.abs(change24).toFixed(2)}%
                    </div>
                </div>
            </div>

            <div class="chart-container">
                <canvas class="chart-canvas" id="chart-${coin.id}"></canvas>
            </div>

            <a href="https://www.coingecko.com/en/coins/${coin.id}" target="_blank" rel="noopener noreferrer" class="view-more-btn">
                <i class="fas fa-external-link-alt"></i> View More on CoinGecko
            </a>
        `;

        grid.appendChild(card);

        // Try fetch chart data; if fails, generate fallback demo data (keeps UI consistent)
        let chartData = null;
        try {
            const chartUrl = `${this.apiBase}/coins/${coin.id}/market_chart?vs_currency=usd&days=1`;
            chartData = await this._safeFetchJson(chartUrl);
        } catch (err) {
            // silently fallback to generated demo series when chart fetch fails
            const currentPrice = coin.current_price || 0;
            const change = (coin.price_change_percentage_24h || 0) / 100;
            const startPrice = currentPrice === 0 ? 0 : currentPrice / (1 + change || 1);
            chartData = { prices: [] };
            for (let i = 0; i < 24; i++) {
                const timestamp = Date.now() - (23 - i) * 60 * 60 * 1000;
                const progress = i / 23;
                const noise = (Math.random() - 0.5) * currentPrice * 0.02;
                const pricePoint = startPrice + (currentPrice - startPrice) * progress + noise;
                chartData.prices.push([timestamp, pricePoint]);
            }
        }

        const canvas = document.getElementById(`chart-${coin.id}`);
        if (canvas && chartData && Array.isArray(chartData.prices) && chartData.prices.length > 0) {
            // store data for potential redraws
            try {
                canvas.dataset.prices = JSON.stringify(chartData.prices);
                canvas.dataset.positive = (change24 >= 0).toString();
            } catch (e) {
                // ignore dataset serialization errors
            }
            this.drawChart(`chart-${coin.id}`, chartData.prices, change24 >= 0);
        } else if (canvas) {
            this.showChartPlaceholder(`chart-${coin.id}`);
        }
    }

    drawChart(canvasId, prices, isPositive) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        // ensure canvas has reasonable size
        if (!canvas.width || !canvas.height) {
            canvas.width = canvas.offsetWidth || 400;
            canvas.height = canvas.offsetHeight || 120;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        if (!Array.isArray(prices) || prices.length === 0) {
            this.showChartPlaceholder(canvasId);
            return;
        }

        // normalize prices
        const cleaned = prices.filter(p => Array.isArray(p) && p.length >= 2 && isFinite(p[1]));
        if (cleaned.length === 0) {
            this.showChartPlaceholder(canvasId);
            return;
        }

        const width = canvas.width;
        const height = canvas.height;
        const padding = 10;

        // Clear
        ctx.clearRect(0, 0, width, height);

        const priceValues = cleaned.map(p => p[1]);
        const minPrice = Math.min(...priceValues);
        const maxPrice = Math.max(...priceValues);
        const priceRange = maxPrice - minPrice || 1;

        // Area gradient
        const lineColor = isPositive ? '#22c55e' : '#ef4444';
        const gradientColor = isPositive ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)';
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, gradientColor);
        gradient.addColorStop(1, 'rgba(255,255,255,0)');

        // draw area
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

        // draw line with glow
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
        if (!canvas.width || !canvas.height) {
            canvas.width = canvas.offsetWidth || 400;
            canvas.height = canvas.offsetHeight || 120;
        }
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const theme = document.documentElement.getAttribute('data-theme') || 'light';
        const bgColor = theme === 'dark' ? '#222' : '#f4f6fb';
        const textColor = theme === 'dark' ? '#999' : '#6b7280';

        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = textColor;
        ctx.font = '13px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Chart data unavailable', canvas.width / 2, canvas.height / 2);
    }

    // ------------ Formatting & UI helpers -------------
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
            // fallback to alert if container missing
            alert(message + ' Please reload the page.');
            return;
        }
        errorElement.textContent = message + ' Please reload the page.';
        errorElement.style.display = 'block';
    }

    hideError() {
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) errorElement.style.display = 'none';
    }

    // ------------ Small safe fetch wrapper (single attempt, no retries) -------------
    async _safeFetchJson(url) {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) {
            // throw so callers can show a user-friendly message
            throw new Error(`HTTP ${res.status}`);
        }
        return await res.json();
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new CryptoApp();
});
