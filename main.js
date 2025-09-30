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

        if (searchBtn && searchInput) {
            searchBtn.addEventListener('click', () => this.handleSearch());
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

        if (!mobileNav || !mobileMenuToggle) return;

        // Desktop navigation
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();

                navLinks.forEach(l => l.classList.remove('active'));
                mobileNavLinks.forEach(l => l.classList.remove('active'));

                link.classList.add('active');

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

                navLinks.forEach(l => l.classList.remove('active'));
                mobileNavLinks.forEach(l => l.classList.remove('active'));

                link.classList.add('active');

                const href = link.getAttribute('href');
                const correspondingDesktopLink = document.querySelector(`.nav-link[href="${href}"]`);
                if (correspondingDesktopLink) {
                    correspondingDesktopLink.classList.add('active');
                }

                this.closeMobileMenu();
                this.scrollToSection(href);
            });
        });

        mobileMenuToggle.addEventListener('click', () => {
            this.toggleMobileMenu();
        });

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
            targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    toggleMobileMenu() {
        const mobileNav = document.getElementById('mobileNav');
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        const toggleIcon = mobileMenuToggle.querySelector('i');

        mobileNav.classList.toggle('active');
        mobileMenuToggle.classList.toggle('active');

        toggleIcon.className = mobileNav.classList.contains('active') ? 'fas fa-times' : 'fas fa-bars';
    }

    closeMobileMenu() {
        const mobileNav = document.getElementById('mobileNav');
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        const toggleIcon = mobileMenuToggle.querySelector('i');

        mobileNav.classList.remove('active');
        mobileMenuToggle.classList.remove('active');
        toggleIcon.className = 'fas fa-bars';
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

        if (themeIcon && themeText) {
            if (theme === 'dark') {
                themeIcon.className = 'fas fa-moon';
                themeText.textContent = 'Dark';
            } else {
                themeIcon.className = 'fas fa-sun';
                themeText.textContent = 'Light';
            }
        }
    }

    async handleSearch() {
        const query = document.getElementById('searchInput').value.trim();
        if (!query) return;

        this.showLoading();
        this.hideError();

        try {
            const searchResponse = await fetch(`${this.apiBase}/search?query=${encodeURIComponent(query)}`);
            if (!searchResponse.ok) throw new Error(`HTTP error: ${searchResponse.status}`);
            const searchData = await searchResponse.json();

            if (searchData.coins && searchData.coins.length > 0) {
                const coinId = searchData.coins[0].id;
                await this.loadSpecificCoin(coinId);
            } else {
                this.showError(`No cryptocurrency found for "${query}". Please try again.`);
            }
        } catch (error) {
            this.showError('Failed to search cryptocurrency. Please check your internet connection.');
            console.error('Search error:', error);
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
            this.showError('Failed to load default cryptocurrencies.');
            console.error('Default coins error:', error);
        } finally {
            this.hideLoading();
        }
    }

    async loadSpecificCoin(coinId) {
        try {
            await this.loadCoins([coinId]);
        } catch (error) {
            this.showError('Failed to load cryptocurrency data.');
            console.error('Specific coin error:', error);
        }
    }

    async loadCoins(coinIds) {
        const coinIdsString = coinIds.join(',');
        const url = `${this.apiBase}/coins/markets?vs_currency=usd&ids=${coinIdsString}&order=market_cap_desc&sparkline=false&price_change_percentage=24h`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const coins = await response.json();
        if (!coins || coins.length === 0) {
            throw new Error('No coin data received');
        }

        document.getElementById('cryptoGrid').innerHTML = '';

        for (const coin of coins) {
            await this.createCoinCard(coin);
        }
    }

    async createCoinCard(coin) {
        const card = document.createElement('div');
        card.className = 'crypto-card';

        let chartData = null;
        try {
            const chartResponse = await fetch(`${this.apiBase}/coins/${coin.id}/market_chart?vs_currency=usd&days=1`);
            if (chartResponse.ok) {
                chartData = await chartResponse.json();
            }
        } catch (error) {
            console.warn(`Failed to load chart for ${coin.id}:`, error);
        }

        const changeClass = coin.price_change_percentage_24h >= 0 ? 'change-positive' : 'change-negative';
        const changeIcon = coin.price_change_percentage_24h >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';

        card.innerHTML = `
            <div class="crypto-header">
                <img src="${coin.image}" alt="${coin.name}" class="crypto-logo">
                <div class="crypto-info">
                    <h3>${coin.name}</h3>
                    <div class="crypto-symbol">${coin.symbol.toUpperCase()}</div>
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
                        ${Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                    </div>
                </div>
            </div>

            <div class="chart-container">
                <canvas class="chart-canvas" id="chart-${coin.id}" width="300" height="120"></canvas>
            </div>

            <a href="https://www.coingecko.com/en/coins/${coin.id}" target="_blank" rel="noopener noreferrer" class="view-more-btn">
                <i class="fas fa-external-link-alt"></i> View More on CoinGecko
            </a>
        `;

        document.getElementById('cryptoGrid').appendChild(card);

        if (chartData && chartData.prices) {
            this.drawChart(`chart-${coin.id}`, chartData.prices, coin.price_change_percentage_24h >= 0);
        }
    }

    drawChart(canvasId, prices, isPositive) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const padding = 10;

        ctx.clearRect(0, 0, width, height);

        const priceValues = prices.map(p => p[1]);
        const minPrice = Math.min(...priceValues);
        const maxPrice = Math.max(...priceValues);
        const priceRange = maxPrice - minPrice;
        if (priceRange === 0) return;

        const lineColor = isPositive ? '#22c55e' : '#ef4444';
        const gradientColor = isPositive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)';

        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, gradientColor);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.beginPath();
        ctx.moveTo(padding, height - padding);

        prices.forEach((p, i) => {
            const x = padding + (i / (prices.length - 1)) * (width - 2 * padding);
            const y = height - padding - ((p[1] - minPrice) / priceRange) * (height - 2 * padding);
            ctx.lineTo(x, y);
        });

        ctx.lineTo(width - padding, height - padding);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        prices.forEach((p, i) => {
            const x = padding + (i / (prices.length - 1)) * (width - 2 * padding);
            const y = height - padding - ((p[1] - minPrice) / priceRange) * (height - 2 * padding);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });

        ctx.stroke();
    }

    formatNumber(num) {
        return num >= 1
            ? num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : num.toFixed(6);
    }

    formatLargeNumber(num) {
        if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
        if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
        return num.toLocaleString();
    }

    showLoading() {
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'block';
    }

    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
    }

    showError(message) {
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    hideError() {
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) errorElement.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new CryptoApp();
});
