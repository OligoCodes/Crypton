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

      searchBtn.addEventListener('click', () => this.handleSearch());
      searchInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
    this.handleSearch();
          }
      });

      // Navigation functionality
      this.setupNavigation();
  }

  setupNavigation() {
      const navLinks = document.querySelectorAll('.nav-link');
      const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
      const mobileMenuToggle = document.getElementById('mobileMenuToggle');
      const mobileNav = document.getElementById('mobileNav');
      
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
          document.querySelector('.search-section').scrollIntoView({
    behavior: 'smooth',
    block: 'center'
          });
      }
  }

 toggleMobileMenu() {
     const mobileNav = document.getElementById('mobileNav');
     const mobileMenuToggle = document.getElementById('mobileMenuToggle');
     const toggleIcon = mobileMenuToggle.querySelector('i');
     
     mobileNav.classList.toggle('active');
     mobileMenuToggle.classList.toggle('active');
     
     // Change icon
     if (mobileNav.classList.contains('active')) {
         toggleIcon.className = 'fas fa-times';
     } else {
         toggleIcon.className = 'fas fa-bars';
     }
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
     const themeIcon = document.getElementById('themeIcon');
     const themeText = document.getElementById('themeText');
     
     // Load saved theme or default to light
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

     if (theme === 'dark') {
         themeIcon.className = 'fas fa-moon';
         themeText.textContent = 'Dark';
     } else {
         themeIcon.className = 'fas fa-sun';
         themeText.textContent = 'Light';
     }
 }

 async handleSearch() {
     const query = document.getElementById('searchInput').value.trim();
     if (!query) return;

     this.showLoading();
     this.hideError();

     try {
         // First, search for the coin to get its ID
         const searchResponse = await fetch(`${this.apiBase}/search?query=${encodeURIComponent(query)}`);
         const searchData = await searchResponse.json();

         if (searchData.coins && searchData.coins.length > 0) {
  const coinId = searchData.coins[0].id;
  await this.loadSpecificCoin(coinId);
         } else {
  this.showError(`No cryptocurrency found for "${query}". Please try a different name or symbol.`);
         }
     } catch (error) {
         this.showError('Failed to search cryptocurrency. Please check your internet connection and try again.');
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
         this.showError('Failed to load cryptocurrency data. Please check your internet connection and try again.');
         console.error('Default coins error:', error);
     } finally {
         this.hideLoading();
     }
 }

 async loadSpecificCoin(coinId) {
     try {
         await this.loadCoins([coinId]);
     } catch (error) {
         this.showError('Failed to load cryptocurrency data. Please try again.');
         console.error('Specific coin error:', error);
     }
 }

 async loadCoins(coinIds) {
     const coinIdsString = coinIds.join(',');
     
     // Fetch basic coin data
     const response = await fetch(`${this.apiBase}/coins/markets?vs_currency=usd&ids=${coinIdsString}&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h`);
     
     if (!response.ok) {
         throw new Error(`HTTP error! status: ${response.status}`);
     }
     
     const coins = await response.json();

     if (!coins || coins.length === 0) {
         throw new Error('No coin data received');
     }

     // Clear existing content
     document.getElementById('cryptoGrid').innerHTML = '';

     // Load each coin with its chart
     for (const coin of coins) {
         await this.createCoinCard(coin);
     }
 }

 async createCoinCard(coin) {
     const card = document.createElement('div');
     card.className = 'crypto-card';

     // Get chart data
     let chartData = null;
     try {
         const chartResponse = await fetch(`${this.apiBase}/coins/${coin.id}/market_chart?vs_currency=usd&days=1`);
         if (chartResponse.ok) {
  chartData = await chartResponse.json();
         }
     } catch (error) {
         console.warn(`Failed to load chart for ${coin.id}:`, error);
         // Create fallback chart data for demonstration
         const currentPrice = coin.current_price;
         const change = coin.price_change_percentage_24h / 100;
         const startPrice = currentPrice / (1 + change);
         
         chartData = {
  prices: []
         };
         
         // Generate 24 data points for the last 24 hours
         for (let i = 0; i < 24; i++) {
  const timestamp = Date.now() - (23 - i) * 60 * 60 * 1000;
  const progress = i / 23;
  const price = startPrice + (currentPrice - startPrice) * progress + 
    (Math.random() - 0.5) * currentPrice * 0.02; // Add some randomness
  chartData.prices.push([timestamp, price]);
         }
     }

     const changeClass = coin.price_change_percentage_24h >= 0 ? 'change-positive' : 'change-negative';
     const changeIcon = coin.price_change_percentage_24h >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';

     card.innerHTML = `
         <div class="crypto-header">
  <img src="${coin.image}" alt="${coin.name}" class="crypto-logo">
  <div class="crypto-info">
      <h3>${coin.name}</h3>
      <div class="crypto-symbol">${coin.symbol}</div>
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
  <canvas class="chart-canvas" id="chart-${coin.id}"></canvas>
         </div>
         
         <a href="https://www.coingecko.com/en/coins/${coin.id}" target="_blank" rel="noopener noreferrer" class="view-more-btn">
  <i class="fas fa-external-link-alt"></i> View More on CoinGecko
         </a>
     `;

     document.getElementById('cryptoGrid').appendChild(card);

     // Draw chart if data is available
     if (chartData && chartData.prices) {
         this.drawChart(`chart-${coin.id}`, chartData.prices, coin.price_change_percentage_24h >= 0);
     } else {
         // Show placeholder if no chart data
         const canvas = document.getElementById(`chart-${coin.id}`);
         const ctx = canvas.getContext('2d');
         canvas.width = canvas.offsetWidth;
         canvas.height = canvas.offsetHeight;
         
         const theme = document.documentElement.getAttribute('data-theme') || 'light';
         const bgColor = theme === 'dark' ? '#3a3a3a' : '#f8f9fa';
         const textColor = theme === 'dark' ? '#888888' : '#666666';
         
         ctx.fillStyle = bgColor;
         ctx.fillRect(0, 0, canvas.width, canvas.height);
         ctx.fillStyle = textColor;
         ctx.font = '14px Arial';
         ctx.textAlign = 'center';
         ctx.fillText('Chart data unavailable', canvas.width / 2, canvas.height / 2);
     }
 }

 drawChart(canvasId, prices, isPositive) {
     const canvas = document.getElementById(canvasId);
     if (!canvas) return;

     const ctx = canvas.getContext('2d');
     canvas.width = canvas.offsetWidth;
     canvas.height = canvas.offsetHeight;

     if (!prices || prices.length === 0) return;

     const width = canvas.width;
     const height = canvas.height;
     const padding = 10;

     // Clear canvas
     ctx.clearRect(0, 0, width, height);

     // Extract price values
     const priceValues = prices.map(p => p[1]);
     const minPrice = Math.min(...priceValues);
     const maxPrice = Math.max(...priceValues);
     const priceRange = maxPrice - minPrice;

     if (priceRange === 0) return;

     // Set line color based on trend
     const lineColor = isPositive ? '#22c55e' : '#ef4444';
     const gradientColor = isPositive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)';

     // Create gradient
     const gradient = ctx.createLinearGradient(0, 0, 0, height);
     gradient.addColorStop(0, gradientColor);
     gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

     // Draw area under curve
     ctx.beginPath();
     ctx.moveTo(padding, height - padding);

     for (let i = 0; i < prices.length; i++) {
         const x = padding + (i / (prices.length - 1)) * (width - 2 * padding);
         const y = height - padding - ((priceValues[i] - minPrice) / priceRange) * (height - 2 * padding);
         
         if (i === 0) {
  ctx.lineTo(x, y);
         } else {
  ctx.lineTo(x, y);
         }
     }

     ctx.lineTo(width - padding, height - padding);
     ctx.closePath();
     ctx.fillStyle = gradient;
     ctx.fill();

     // Draw line
     ctx.beginPath();
     ctx.strokeStyle = lineColor;
     ctx.lineWidth = 2;
     ctx.lineJoin = 'round';
     ctx.lineCap = 'round';

     for (let i = 0; i < prices.length; i++) {
         const x = padding + (i / (prices.length - 1)) * (width - 2 * padding);
         const y = height - padding - ((priceValues[i] - minPrice) / priceRange) * (height - 2 * padding);
         
         if (i === 0) {
  ctx.moveTo(x, y);
         } else {
  ctx.lineTo(x, y);
         }
     }

     ctx.stroke();

     // Add glow effect
     ctx.shadowColor = lineColor;
     ctx.shadowBlur = 10;
     ctx.stroke();
     ctx.shadowBlur = 0;
 }

 formatNumber(num) {
     if (num >= 1) {
         return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
     } else {
         return num.toFixed(6);
     }
 }

 formatLargeNumber(num) {
     if (num >= 1e12) {
         return (num / 1e12).toFixed(2) + 'T';
     } else if (num >= 1e9) {
         return (num / 1e9).toFixed(2) + 'B';
     } else if (num >= 1e6) {
         return (num / 1e6).toFixed(2) + 'M';
     } else if (num >= 1e3) {
         return (num / 1e3).toFixed(2) + 'K';
     } else {
         return num.toLocaleString();
     }
 }

 showLoading() {
     document.getElementById('loading').style.display = 'block';
 }

 hideLoading() {
     document.getElementById('loading').style.display = 'none';
 }

 showError(message) {
     const errorElement = document.getElementById('errorMessage');
     errorElement.textContent = message;
     errorElement.style.display = 'block';
 }

 hideError() {
     document.getElementById('errorMessage').style.display = 'none';
 }
        }

        // Initialize the app when the page loads
        document.addEventListener('DOMContentLoaded', () => {
 new CryptoApp();
        });
