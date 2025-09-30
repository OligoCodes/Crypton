class CryptoApp {
    constructor() {
        this.apiBase = 'https://api.coingecko.com/api/v3';
        // quick symbol -> id map for popular coins (speeds up common searches)
        this.symbolMap = {
            btc: 'bitcoin',
            eth: 'ethereum',
            bnb: 'binancecoin',
            sol: 'solana',
            doge: 'dogecoin',
            ada: 'cardano',
            xrp: 'ripple',
            dot: 'polkadot',
            matic: 'matic-network',
            shib: 'shiba-inu',
            ltc: 'litecoin',
            link: 'chainlink'
        };
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

        // Defensive: only attach if elements exist
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.handleSearch());
        }
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleSearch();
                }
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
        if (!mobileMenuToggle || !mobileNav) {
            // still wire desktop links if available
            if (navLinks && navLinks.length) {
                navLinks.forEach(link => {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        navLinks.forEach(l => l.classList.remove('active'));
                        const href = link.getAttribute('href');
                        link.classList.add('active');
                        this.scrollToSection(href);
                    });
                });
            }
            return;
        }

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
            const s = document.querySelector('.search-section');
            if (s) s.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
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
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.setTheme(savedTheme);

        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
                const newTheme = currentTheme === 'light' ? 'dark' : 'light';
                this.setTheme(newTheme);
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
    }

    // ------------ Search & Loading -------------
    async handleSearch() {
        const inputEl = document.getElementById('searchInput');
        if (!inputEl) return;
        const raw = inputEl.value || '';
        const query = raw.trim();
        if (!query) return;

        this.showLoading();
        this.hideError();

        const q = query.toLowerCase();

        // quick symbol map check
        if (this.symbolMap[q]) {
            await this.loadSpecificCoin(this.symbolMap[q]);
            this.hideLoading();
            return;
        }

        // fallback: CoinGecko search endpoint
        try {
            const searchUrl = `${this.apiBase}/search?query=${encodeURIComponent(query)}`;
            const res = await fetch(searchUrl, { cache: 'no-store' });

            if (!res.ok) {
                if (!navigator.onLine) {
                    this.showError('Please check your internet connection.');
                } else {
                    this.showError('Failed to search cryptocurrency. Please reload the page.');
                }
                this.hideLoading();
                return;
            }

            const searchData = await res.json();
            if (searchData && Array.isArray(searchData.coins) && searchData.coins.length > 0) {
                // prefer exact symbol or id match
                const exactBySymbol = searchData.coins.find(c => c.symbol && c.symbol.toLowerCase() === q);
                const exactById = searchData.coins.find(c => c.id && c.id.toLowerCase() === q);
                const chosen = exactBySymbol || exactById || searchData.coins[0];
                if (chosen && chosen.id) {
                    await this.loadSpecificCoin(chosen.id);
                } else {
                    this.showError(`Coin "${query}" not found on CoinGecko.`);
                }
            } else {
                this.showError(`Coin "${query}" not found on CoinGecko.`);
            }
        } catch (err) {
            if (!navigator.onLine) {
                this.showError('Please check your internet connection.');
            } else {
                this.showError('Failed to search cryptocurrency. Please reload the page.');
            }
        } finally {
            this.hideLoading();
        }
    }

    async loadDefaultCoins() {
        this.showLoading();
        this.hideError();

        try {
            await this.loadCoins(this.defaultCoins);
        } catch (error) {
            if (!navigator.onLine) {
                this.showError('Please check your internet connection.');
            } else {
                this.showError('Failed to load cryptocurrency data. Please reload the page.');
            }
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
        } catch (error) {
            if (!navigator.onLine) {
                this.showError('Please check your internet connection.');
            } else {
                this.showError('Failed to load cryptocurrency data. Please reload the page.');
            }
        } finally {
            this.hideLoading();
        }
    }

    async loadCoins(coinIds) {
        // coinIds expected as array
        if (!coinIds || coinIds.length === 0) return;

        const coinIdsString = coinIds.join(',');
        const marketsUrl = `${this.apiBase}/coins/markets?vs_currency=usd&ids=${encodeURIComponent(coinIdsString)}&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h`;

        try {
            const response = await fetch(marketsUrl, { cache: 'no-store' });

            if (!response.ok) {
                if (!navigator.onLine) {
                    this.showError('Please check your internet connection.');
                } else if (response.status === 404) {
                    this.showError('Coin not found on CoinGecko.');
                } else {
                    this.showError('Failed to fetch market data. Please reload the page.');
                }
                return;
            }

            const coins = await response.json();

            if (!coins || coins.length === 0) {
                this.showError('No market data returned. The coin may not exist on CoinGecko.');
                return;
            }

            const gridEl = document.getElementById('cryptoGrid');
            if (!gridEl) return;
            gridEl.innerHTML = '';

            // Load each coin with its chart
            for (const coin of coins) {
                await this.createCoinCard(coin);
            }
        } catch (err) {
            if (!navigator.onLine) {
                this.showError('Please check your internet connection.');
            } else {
                this.showError('Failed to fetch market data. Please reload the page.');
            }
        }
    }

    // ------------ Card & Chart -------------
    async createCoinCard(coin) {
        const card = document.createElement('div');
        card.className = 'crypto-card';

        // Get chart data
        let chartData = null;
        try {
            const chartResponse = await fetch(`${this.apiBase}/coins/${coin.id}/market_chart?vs_currency=usd&days=1`, { cache: 'no-store' });
            if (chartResponse && chartResponse.ok) {
                chartData = await chartResponse.json();
            }
        } catch (error) {
            // fall back silently to demo series (no console logs)
            chartData = null;
        }

        // If chartData is null, we'll generate fallback below

        const change24 = typeof coin.price_change_percentage_24h === 'number' ? coin.price_change_percentage_24h : 0;
        const changeClass = change24 >= 0 ? 'change-positive' : 'change-negative';
        const changeIcon = change24 >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';

        card.innerHTML = `
            <div class="crypto-header">
                <img src="${coin.image || ''}" alt="${coin.name}" class="crypto-logo" onerror="this.style.visibility='hidden'">
                <div class="crypto-info">
                    <h3>${coin.name}</h3>
                    <div class="crypto-symbol">${(coin.symbol || '').toUpperCase()}</div>
                </div>
            </div>

            <div class="crypto-price">$${this.formatNumber(coin.current_price)}</div>

            <div class="crypto-stats">
                <div class="stat">
                    <div class="stat-label">Market Cap</div>
                    <div class="stat-value">$${this.formatLargeNumber(coin.market_cap)}</div>
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

        const grid = document.getElementById('cryptoGrid');
        if (grid) grid.appendChild(card);

        // If chartData missing or malformed, generate fallback 24h data
        if (!chartData || !Array.isArray(chartData.prices) || chartData.prices.length === 0) {
            const currentPrice = typeof coin.current_price === 'number' ? coin.current_price : 0;
            const change = (typeof coin.price_change_percentage_24h === 'number') ? (coin.price_change_percentage_24h / 100) : 0;
            const startPrice = (currentPrice === 0 || !isFinite(1 + change)) ? currentPrice : (currentPrice / (1 + change));
            chartData = { prices: [] };
            for (let i = 0; i < 24; i++) {
                const timestamp = Date.now() - (23 - i) * 60 * 60 * 1000;
                const progress = i / 23;
                const noise = (Math.random() - 0.5) * currentPrice * 0.02;
                const price = startPrice + (currentPrice - startPrice) * progress + noise;
                chartData.prices.push([timestamp, price]);
            }
        }

        const canvas = document.getElementById(`chart-${coin.id}`);
        if (canvas && chartData && Array.isArray(chartData.prices) && chartData.prices.length > 0) {
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

        // ensure canvas size
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

        const cleaned = prices.filter(p => Array.isArray(p) && p.length >= 2 && isFinite(p[1]));
        if (cleaned.length === 0) {
            this.showChartPlaceholder(canvasId);
            return;
        }

        const width = canvas.width;
        const height = canvas.height;
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

        // line with glow
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
            // fallback to alert if developer removed container
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
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new CryptoApp();
});
