// Digimest Frontend Catalog & Checkout Engine

let allProducts = [];
let selectedProduct = null;

// Format Currency
function formatCurrency(amountIDR, amountUSD = 0) {
  if (window.DigimestCurrency && typeof window.DigimestCurrency.format === 'function') {
    return window.DigimestCurrency.format(amountIDR, amountUSD);
  }
  return 'Rp ' + Number(amountIDR || 0).toLocaleString('id-ID');
}

function formatIDR(num) {
  return formatCurrency(num, 0);
}

// Toast helper
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// LocalStorage History Helpers (Delegates to unified DigihubOrders)
function getHistory() {
  const handler = window.DigimestOrders || window.DigihubOrders || window.StoreKuOrders;
  return handler ? handler.getOrders() : [];
}

function saveHistoryItem(item) {
  const handler = window.DigimestOrders || window.DigihubOrders || window.StoreKuOrders;
  if (handler) {
    handler.saveOrder(item);
  }
}

function updateHistoryBadge() {
  const handler = window.DigimestOrders || window.DigihubOrders || window.StoreKuOrders;
  if (handler) {
    handler.updateBadge();
  }
}

// Render Products Grid
function renderProducts(products) {
  const grid = document.getElementById('productsGrid');
  const empty = document.getElementById('emptyCatalog');
  const loading = document.getElementById('loadingCatalog');

  if (loading) loading.style.display = 'none';

  if (!products || products.length === 0) {
    if (grid) grid.style.display = 'none';
    if (empty) empty.style.display = 'block';
    return;
  }

  if (empty) empty.style.display = 'none';
  if (grid) grid.style.display = 'grid';
  const isEn = document.documentElement.lang === 'en' || window.location.pathname.startsWith('/en');
  const prodBaseUrl = isEn ? '/en/product?slug=' : '/product?slug=';

  grid.innerHTML = products.map(p => {
    const isOut = p.stock <= 0 || !!p.isForceOutOfStock;
    const stockDisplay = isOut
      ? (isEn ? 'Out of Stock' : 'Habis')
      : (p.stockCapped ? (isEn ? '>1000 In Stock' : '>1000 Stok') : (isEn ? `${p.stock} In Stock` : `${p.stock} Stok`));
    const logoSrc = p.logo || 'https://via.placeholder.com/46?text=DC';
    const salesCountVal = (p.salesCount !== undefined && p.salesCount !== null)
      ? p.salesCount
      : ((p.sales_count !== undefined && p.sales_count !== null) ? p.sales_count : 10);
    const prodLink = prodBaseUrl + encodeURIComponent(p.slug || '');

    return `
      <div class="product-card ${isOut ? 'out-of-stock' : ''}" onclick="window.location.href='${prodLink}'" style="cursor: pointer;">
        <div class="prod-card-body">
          <div class="prod-header">
            <img src="${logoSrc}" alt="${escapeHtml(p.name)}" class="prod-logo" onerror="this.src='https://via.placeholder.com/46?text=DC'">
            <div class="prod-title-wrap">
              <div class="prod-header-meta">
                <span class="prod-category">${escapeHtml(p.type || 'Digital License')}</span>
                <span class="prod-sold-badge">${salesCountVal} ${isEn ? 'sold' : 'terjual'}</span>
              </div>
              <h3 class="prod-title" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</h3>
            </div>
          </div>

          <div class="prod-tags-row">
            ${p.hasPromo ? `<span class="badge badge-promo">${p.discountPercent}% OFF</span>` : ''}
            <span class="badge badge-stock ${isOut ? 'empty' : ''}">
              ● ${stockDisplay}
            </span>
            ${p.warranty ? `<span class="badge badge-warranty">${escapeHtml(p.warranty)}</span>` : ''}
            ${p.region ? `<span class="badge badge-region">${escapeHtml(p.region)}</span>` : ''}
          </div>

          <div class="prod-desc">${escapeHtml(p.description || (isEn ? 'Instant premium digital license delivered.' : 'Lisensi akun premium langsung aktif.'))}</div>
        </div>

        <div class="prod-footer">
          <div class="price-wrap">
            ${p.hasPromo ? `
              <div class="price-strike-wrap">
                <span class="price-original-striked">${formatCurrency(p.referencePriceIDR)}</span>
                <span class="badge-discount-mini">-${p.discountPercent}%</span>
              </div>
              <span class="price-amount promo-highlight">${formatCurrency(p.priceIDR)}</span>
            ` : `
              <span class="price-label">${isEn ? 'Starting From' : 'Mulai Dari'}</span>
              <span class="price-amount">${formatCurrency(p.priceIDR)}</span>
            `}
          </div>
          <button class="btn-buy btn-buy-catalog ${isOut ? 'btn-buy-out' : ''}" onclick="event.stopPropagation(); window.location.href='${prodLink}'">
            ${isOut ? (isEn ? 'Sold Out' : 'Habis') : (isEn ? 'Buy ➔' : 'Beli ➔')}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Filter and Search
function applyFilterAndSearch() {
  const query = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
  const activeFilterBtn = document.querySelector('.tag-btn.active');
  const filterCat = activeFilterBtn?.dataset?.filter || 'all';

  let filtered = allProducts.filter(p => {
    const fullSearchText = `${p.name || ''} ${p.description || ''} ${p.type || ''} ${p.category || ''}`.toLowerCase();
    const nameMatch = !query || fullSearchText.includes(query);

    if (!nameMatch) return false;

    if (filterCat === 'all') return true;
    if (filterCat === 'ai') return /(^|\W)(ai|artificial intelligence|gpt|gemini|chatgpt|claude|lovable|elevenlabs|midjourney|perplexity|cursor|deepseek|copilot|openai|anthropic)(\W|$)/i.test(fullSearchText);
    if (filterCat === 'vpn') return /(^|\W)(vpn|nord|shield|surfshark|express|cyberghost|mullvad|proxy|wireguard)(\W|$)/i.test(fullSearchText);
    if (filterCat === 'stream') return /(^|\W)(stream|streaming|youtube|netflix|spotify|media|disney|prime|hbo|apple tv|deezer|vidio|wetv)(\W|$)/i.test(fullSearchText);
    if (filterCat === 'edu') return /(^|\W)(edu|education|edukasi|coursera|duolingo|adobe|notion|canva|skillshare|udemy|grammarly)(\W|$)/i.test(fullSearchText);

    return true;
  });

  renderProducts(filtered);
}

// History Modal Render (Uses unified DigimestOrders with scroll lock)
function openHistoryModal() {
  const orderHandler = window.DigimestOrders || window.DigihubOrders || window.StoreKuOrders;
  if (orderHandler && typeof orderHandler.openModal === 'function') {
    orderHandler.openModal('historyListContainer', 'historyModal');
    return;
  }
  if (orderHandler) {
    orderHandler.renderHistoryList('historyListContainer');
  }
  const modal = document.getElementById('historyModal');
  if (modal) {
    modal.classList.add('open');
    document.body.classList.add('modal-open');
  }
}

function closeHistoryModal() {
  const orderHandler = window.DigimestOrders || window.DigihubOrders || window.StoreKuOrders;
  if (orderHandler && typeof orderHandler.closeModal === 'function') {
    orderHandler.closeModal('historyModal');
    return;
  }
  const modal = document.getElementById('historyModal');
  if (modal) {
    modal.classList.remove('open');
    document.body.classList.remove('modal-open');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag] || tag));
}

// ==========================================================================
// HERO CAROUSEL CONTROLLER (60FPS HARDWARE ACCELERATED & TOUCH SWIPE)
// ==========================================================================
function createCarouselController({ containerId, trackId, prevBtnId, nextBtnId, dotsSelector, progressId, duration = 3500 }) {
  const container = document.getElementById(containerId);
  const track = document.getElementById(trackId);
  const prevBtn = document.getElementById(prevBtnId);
  const nextBtn = document.getElementById(nextBtnId);
  const progressBar = document.getElementById(progressId);

  if (!container || !track) return null;

  const slides = container.querySelectorAll('.carousel-slide');
  const dots = document.querySelectorAll(dotsSelector);

  if (slides.length <= 1) return null;

  const totalSlides = slides.length;
  let currentIndex = 0;
  const slideDuration = duration;
  let slideTimer = null;
  let progressTimer = null;
  let progressStart = Date.now();
  let isPaused = false;

  function updateSlide(index, animate = true) {
    if (index < 0) {
      currentIndex = totalSlides - 1;
    } else if (index >= totalSlides) {
      currentIndex = 0;
    } else {
      currentIndex = index;
    }

    if (!animate) {
      track.style.transition = 'none';
    } else {
      track.style.transition = 'transform 0.55s cubic-bezier(0.2, 0.9, 0.3, 1)';
    }

    track.style.transform = `translate3d(-${currentIndex * 100}%, 0, 0)`;

    // Update active classes for slides & dots
    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === currentIndex);
    });

    dots.forEach((dot, i) => {
      const isActive = i === currentIndex;
      dot.classList.toggle('active', isActive);
      dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    resetProgress();
  }

  function startAutoplay() {
    clearTimeout(slideTimer);
    clearInterval(progressTimer);
    if (isPaused) return;

    progressStart = Date.now();
    if (progressBar) progressBar.style.width = '0%';

    progressTimer = setInterval(() => {
      if (isPaused) return;
      const elapsed = Date.now() - progressStart;
      const pct = Math.min(100, (elapsed / slideDuration) * 100);
      if (progressBar) progressBar.style.width = pct + '%';
    }, 40);

    slideTimer = setTimeout(() => {
      if (!isPaused) {
        updateSlide(currentIndex + 1);
      }
    }, slideDuration);
  }

  function resetProgress() {
    clearTimeout(slideTimer);
    clearInterval(progressTimer);
    startAutoplay();
  }

  function pause() {
    isPaused = true;
    clearTimeout(slideTimer);
    clearInterval(progressTimer);
  }

  function resume() {
    if (!isPaused) return;
    isPaused = false;
    startAutoplay();
  }

  // Button Listeners
  prevBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    updateSlide(currentIndex - 1);
  });

  nextBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    updateSlide(currentIndex + 1);
  });

  // Dots click
  dots.forEach(dot => {
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(e.currentTarget.dataset.index, 10);
      if (!isNaN(idx)) {
        updateSlide(idx);
      }
    });
  });

  // Pause on hover
  container.addEventListener('mouseenter', pause);
  container.addEventListener('mouseleave', resume);

  // Touch Swipe Gesture
  let touchStartX = 0;
  let touchStartY = 0;
  let touchEndX = 0;
  let touchEndY = 0;
  let isSwiping = false;

  container.addEventListener('touchstart', (e) => {
    pause();
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchEndX = touch.clientX;
    touchEndY = touch.clientY;
    isSwiping = true;
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (!isSwiping) return;
    const touch = e.touches[0];
    touchEndX = touch.clientX;
    touchEndY = touch.clientY;
  }, { passive: true });

  container.addEventListener('touchend', () => {
    if (!isSwiping) return;
    isSwiping = false;
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
      if (diffX < 0) {
        updateSlide(currentIndex + 1);
      } else {
        updateSlide(currentIndex - 1);
      }
    }
    resume();
  });

  // Page Visibility Change
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pause();
    } else {
      resume();
    }
  });

  // Keyboard navigation
  container.setAttribute('tabindex', '0');
  container.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      updateSlide(currentIndex - 1);
    } else if (e.key === 'ArrowRight') {
      updateSlide(currentIndex + 1);
    }
  });

  // Init First Slide & Run
  updateSlide(0, false);
  startAutoplay();

  return { updateSlide, pause, resume };
}

function initHeroCarousels() {
  // Desktop Slider (Fast 3200ms cycle between banner1 and banner2)
  createCarouselController({
    containerId: 'heroCarouselDesktop',
    trackId: 'carouselTrackDesktop',
    prevBtnId: 'carouselPrevBtnDesktop',
    nextBtnId: 'carouselNextBtnDesktop',
    dotsSelector: '#carouselPaginationDesktop .carousel-dot',
    progressId: 'carouselProgressBarDesktop',
    duration: 3200
  });

  // Mobile Slider (Smooth 4500ms cycle across all 3 banners)
  createCarouselController({
    containerId: 'heroCarouselMobile',
    trackId: 'carouselTrackMobile',
    prevBtnId: 'carouselPrevBtnMobile',
    nextBtnId: 'carouselNextBtnMobile',
    dotsSelector: '#carouselPaginationMobile .carousel-dot',
    progressId: 'carouselProgressBarMobile',
    duration: 4500
  });
}

// ==========================================================================
// ENHANCED PROMINENT SEARCH CONTROLLER (DESKTOP & MOBILE)
// ==========================================================================
function initEnhancedSearch() {
  const searchInput = document.getElementById('searchInput');
  const searchClearBtn = document.getElementById('searchClearBtn');
  const searchSubmitBtn = document.getElementById('searchSubmitBtn');

  if (!searchInput) return;

  function handleSearchInput() {
    const val = searchInput.value.trim();
    if (searchClearBtn) {
      searchClearBtn.style.display = val.length > 0 ? 'flex' : 'none';
    }
    applyFilterAndSearch();
  }

  function handleSearchSubmit() {
    applyFilterAndSearch();
    // Scroll smoothly to products catalog section if user presses search button or enter
    const target = document.getElementById('productsGrid') || document.getElementById('loadingCatalog');
    if (target) {
      const topOffset = target.getBoundingClientRect().top + window.pageYOffset - 100;
      window.scrollTo({ top: topOffset, behavior: 'smooth' });
    }
  }

  searchInput.addEventListener('input', handleSearchInput);

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchSubmit();
    }
  });

  searchSubmitBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    handleSearchSubmit();
  });

  searchClearBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    searchInput.value = '';
    searchClearBtn.style.display = 'none';
    searchInput.focus();
    applyFilterAndSearch();
  });
}

// Lifecycle Init
document.addEventListener('DOMContentLoaded', async () => {
  updateHistoryBadge();
  initHeroCarousels();
  initEnhancedSearch();

  // Load products
  try {
    const productsUrl = window.digimestApi ? window.digimestApi('/api/products') : '/api/products';
    const res = await fetch(productsUrl);
    const data = await res.json();
    const isEn = document.documentElement.lang === 'en' || window.location.pathname.startsWith('/en');
    const loadingEl = document.getElementById('loadingCatalog');
    if (data.success && data.data) {
      allProducts = data.data;
      renderProducts(allProducts);
    } else {
      if (loadingEl) loadingEl.textContent = (isEn ? 'Failed to load catalog: ' : 'Gagal memuat katalog: ') + (data.error || 'Server error');
    }
  } catch (e) {
    const isEn = document.documentElement.lang === 'en' || window.location.pathname.startsWith('/en');
    const loadingEl = document.getElementById('loadingCatalog');
    if (loadingEl) loadingEl.textContent = (isEn ? 'Connection to backend failed: ' : 'Koneksi ke backend gagal: ') + e.message;
  }

  // Filter tag buttons
  document.querySelectorAll('.tag-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      applyFilterAndSearch();
    });
  });

  document.getElementById('openHistoryBtn')?.addEventListener('click', openHistoryModal);
  document.getElementById('closeHistoryBtn')?.addEventListener('click', closeHistoryModal);

  // Close modals on clicking overlay outside card
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      closeHistoryModal();
    }
  });

  // Reactive Currency Switcher Listener
  window.addEventListener('currencychange', () => {
    if (allProducts && allProducts.length > 0) {
      applyFilterAndSearch();
    }
  });

  // Store Announcement Popup Init
  initStoreAnnouncement();
});

// ==========================================================================
// STORE ANNOUNCEMENT POPUP ENGINE (ROOT PAGE ONLY, ANTI-SPAM, AUTO-RENEW)
// ==========================================================================
async function initStoreAnnouncement() {
  const modal = document.getElementById('announcementModal');
  if (!modal) return;

  let annVersion = '1';

  function closeModal(actionType) {
    modal.classList.remove('open');
    document.body.classList.remove('modal-open');
    setTimeout(() => {
      modal.style.display = 'none';
    }, 250);

    if (actionType === 'never' || actionType === 'ok') {
      // Suppress across reloads until admin publishes new updated_at version
      localStorage.setItem('digimest_announcement_dismissed_ver', annVersion);
      sessionStorage.setItem('digimest_announcement_session_closed', annVersion);
    } else {
      // Closed with (✕) or overlay: suppress for current browser tab session
      sessionStorage.setItem('digimest_announcement_session_closed', annVersion);
    }
  }

  // Button & overlay event listeners (always active once initialized)
  document.getElementById('btnAnnouncementNever')?.addEventListener('click', () => closeModal('never'));
  document.getElementById('btnAnnouncementOk')?.addEventListener('click', () => closeModal('ok'));
  document.getElementById('btnAnnouncementClose')?.addEventListener('click', () => closeModal('close'));

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal('close');
    }
  });

  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape' && modal.classList.contains('open')) {
      closeModal('close');
    }
  });

  // 1. Only run auto-popup check on root page
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const isRoot = path === '/' || path === '/index.html' || path === '/en' || path === '/en/index.html';
  if (!isRoot) return;

  const isEn = (document.documentElement && document.documentElement.lang === 'en') || path.startsWith('/en');

  try {
    const apiUrl = window.digimestApi ? window.digimestApi('/api/announcement') : '/api/announcement';
    const res = await fetch(apiUrl);
    if (!res.ok) return;
    const json = await res.json();
    if (!json.success || !json.data) return;

    const ann = json.data;
    if (!ann.is_active || !ann.title) return;

    annVersion = String(ann.updated_at || '1');
    const dismissedVer = localStorage.getItem('digimest_announcement_dismissed_ver');
    const sessionClosedVer = sessionStorage.getItem('digimest_announcement_session_closed');

    // If dismissed permanently for this version OR closed in this session -> don't show
    if (dismissedVer === annVersion || sessionClosedVer === annVersion) {
      return;
    }

    // Populate data
    const titleEl = document.getElementById('announcementTitle');
    const bodyEl = document.getElementById('announcementBody');
    const bannerEl = document.getElementById('announcementBannerImg');
    const dateTextEl = document.getElementById('announcementDateText');
    const actionWrap = document.getElementById('announcementActionWrap');
    const actionLink = document.getElementById('announcementActionLink');

    const displayTitle = (isEn && ann.title_en) ? ann.title_en : ann.title;
    const displayContent = (isEn && ann.content_en) ? ann.content_en : (ann.content || '');
    const displayActionText = (isEn && ann.action_text_en) ? ann.action_text_en : (ann.action_text || (isEn ? 'Learn More ➔' : 'Lihat Selengkapnya ➔'));

    if (titleEl) titleEl.textContent = displayTitle;
    if (bodyEl) bodyEl.textContent = displayContent;

    const btnDismiss = document.getElementById('btnAnnouncementNever');
    const btnOk = document.getElementById('btnAnnouncementOk');
    if (btnDismiss) btnDismiss.textContent = isEn ? "Don't show again" : "Jangan tampilkan lagi";
    if (btnOk) btnOk.textContent = isEn ? "OK, Understood" : "OK, Mengerti";

    if (bannerEl && ann.banner_url) {
      bannerEl.src = ann.banner_url;
    }

    if (dateTextEl && ann.updated_at) {
      try {
        const d = new Date(ann.updated_at * 1000);
        dateTextEl.textContent = d.toLocaleDateString(isEn ? 'en-US' : 'id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      } catch (e) {
        dateTextEl.textContent = '-';
      }
    }

    if (actionWrap && actionLink) {
      if (ann.action_url) {
        actionLink.href = ann.action_url;
        actionLink.textContent = displayActionText;
        actionWrap.style.display = 'block';
      } else {
        actionWrap.style.display = 'none';
      }
    }

    // Open Modal with smooth transition
    modal.style.display = 'flex';
    void modal.offsetWidth; // Reflow
    modal.classList.add('open');
    document.body.classList.add('modal-open');

  } catch (err) {
    console.debug('Announcement check skipped:', err);
  }
}

