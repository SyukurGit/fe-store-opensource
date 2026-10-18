// Digimest Product Detail JavaScript
let currentProduct = null;
let currentQty = 1;
let appliedVoucher = null;
let selectedPaymentGateway = 'PAYMENTG';
let selectedPaymentMethod = 'QRIS';
let selectedPaymentChannel = 'SHOPEEPAY';
let appConfig = { usd_rate: 18000 };
let initialCheckoutCurrency = 'IDR';

function shouldShowQrisNotice() {
  // 1. Target: Pengguna yang sebelum checkout mengatur mata uang USD
  if (initialCheckoutCurrency === 'USD') return true;

  // 2. Target: Pengguna dengan IP Non-Indonesia
  const clientCountry = (window.digimestClientCountry || sessionStorage.getItem('digimest_client_country') || '').toUpperCase();
  if (clientCountry && clientCountry !== 'ID') return true;

  // Selain itu (Pengguna dengan mata uang IDR & IP Indonesia), jangan tampilkan notice saat gonta-ganti
  return false;
}

document.addEventListener('DOMContentLoaded', () => {
  initProductPage();
  setupEventListeners();
});

function formatCurrency(amountIDR, amountUSD = 0) {
  if (window.DigimestCurrency && typeof window.DigimestCurrency.format === 'function') {
    return window.DigimestCurrency.format(amountIDR, amountUSD);
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amountIDR || 0);
}

function formatIDR(num) {
  return formatCurrency(num, 0);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

function updateUsdRateDisplays() {
  const rateText = (appConfig.usd_rate || 18000).toLocaleString('id-ID');
  const el1 = document.getElementById('mUsdRateText');
  if (el1) el1.textContent = rateText;
  const el2 = document.getElementById('mSummaryUsdRate');
  if (el2) el2.textContent = rateText;
  const el3 = document.getElementById('qrisNoticeRate');
  if (el3) el3.textContent = rateText;
}

async function initProductPage() {
  // Fetch dynamic usd_rate from app config
  fetch(window.digimestApi ? window.digimestApi('/api/config') : '/api/config')
    .then(r => r.json())
    .then(json => {
      const rate = (json && json.data && json.data.usd_rate) || (json && json.usd_rate);
      if (rate) {
        appConfig.usd_rate = parseFloat(rate) || 18000;
        updateUsdRateDisplays();
        updateCalculations();
      }
    })
    .catch(() => {});

  const params = new URLSearchParams(window.location.search);
  const rawSlug = params.get('slug');

  if (!rawSlug) {
    showError('Parameter Produk Kosong', 'Silakan pilih produk dari katalog toko terlebih dahulu.');
    return;
  }

  // Clean slug variations
  let cleanSlug = rawSlug;
  try {
    cleanSlug = decodeURIComponent(rawSlug);
  } catch (e) {}

  try {
    // 1. Try direct detail fetch with literal '+' (Chi router matches literal '+')
    const pathSlug = encodeURIComponent(cleanSlug).replace(/%2B/gi, '+');
    const detailUrl = window.digimestApi ? window.digimestApi(`/api/products/${pathSlug}`) : `/api/products/${pathSlug}`;
    let res = await fetch(detailUrl);

    if (!res.ok && pathSlug !== cleanSlug) {
      const altUrl = window.digimestApi ? window.digimestApi(`/api/products/${encodeURIComponent(cleanSlug)}`) : `/api/products/${encodeURIComponent(cleanSlug)}`;
      const altRes = await fetch(altUrl);
      if (altRes.ok) res = altRes;
    }

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        currentProduct = json.data;
        renderProductDetail(currentProduct, json.review_stats, json.reviews);
        return;
      }
    }

    // 2. SELF-HEALING FALLBACK: If direct slug fetch failed (404/encoding issue), fallback to /api/products catalog!
    console.warn('Direct detail lookup missed, activating catalog fallback for:', cleanSlug);
    const catalogUrl = window.digimestApi ? window.digimestApi('/api/products') : '/api/products';
    const catRes = await fetch(catalogUrl);
    if (catRes.ok) {
      const catJson = await catRes.json();
      const list = catJson.data || [];

      // Flexible matching: exact, unescaped, normalized (+ vs _ vs space)
      const normSlug = cleanSlug.toLowerCase().replace(/[^a-z0-9]/g, '');
      const found = list.find(p => {
        if (!p || !p.slug) return false;
        if (p.slug === cleanSlug || p.slug === rawSlug) return true;
        const normP = p.slug.toLowerCase().replace(/[^a-z0-9]/g, '');
        return normP === normSlug;
      });

      if (found) {
        currentProduct = found;
        let rStats = null, rList = [];
        try {
          const revUrl = window.digimestApi ? window.digimestApi(`/api/products/${encodeURIComponent(found.slug)}/reviews`) : `/api/products/${encodeURIComponent(found.slug)}/reviews`;
          const revRes = await fetch(revUrl);
          if (revRes.ok) {
            const revJson = await revRes.json();
            rStats = revJson.stats;
            rList = revJson.data;
          }
        } catch (e) {}
        renderProductDetail(currentProduct, rStats, rList);
        return;
      }
    }

    // Only if both direct fetch and catalog fallback completely fail
    const errData = await res.json().catch(() => ({}));
    showError('Produk Tidak Ditemukan', errData.error || `Produk '${cleanSlug}' tidak ditemukan atau sedang tidak aktif.`);

  } catch (err) {
    console.error('Fetch product error:', err);
    showError('Koneksi Gagal', 'Gagal menghubungi server Digimest. Silakan coba beberapa saat lagi.');
  }
}

function showError(title, msg) {
  document.getElementById('productLoading').style.display = 'none';
  document.getElementById('productDetailContent').style.display = 'none';
  const errBox = document.getElementById('productError');
  errBox.style.display = 'block';
  document.getElementById('errorTitle').textContent = title;
  document.getElementById('errorMessage').textContent = msg;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getStarString(rating) {
  const rounded = Math.round(Number(rating || 5));
  let stars = '';
  for (let i = 1; i <= 5; i++) {
    stars += i <= rounded ? '★' : '☆';
  }
  return stars;
}

function renderReviewsSection(stats, reviews) {
  const avg = stats?.average_rating || 5.0;
  const count = stats?.total_reviews || (reviews ? reviews.length : 0);

  const avgEl = document.getElementById('dRatingAvgText');
  if (avgEl) avgEl.textContent = avg.toFixed(1);

  const isEn = (document.documentElement && document.documentElement.lang === 'en') || window.location.pathname.startsWith('/en');
  const countEl = document.getElementById('dRatingCountText');
  if (countEl) countEl.textContent = isEn ? `(${count} reviews)` : `(${count} ulasan)`;

  const scoreBig = document.getElementById('revOverallScore');
  if (scoreBig) scoreBig.textContent = avg.toFixed(1);

  const overallStars = document.getElementById('revOverallStars');
  if (overallStars) overallStars.textContent = getStarString(avg);

  const overallCount = document.getElementById('revOverallCount');
  if (overallCount) overallCount.textContent = isEn ? `Based on ${count} reviews` : `Berdasarkan ${count} ulasan`;

  // Star breakdown bars
  const barsWrap = document.getElementById('revBreakdownBars');
  if (barsWrap) {
    const dist = stats?.distribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let html = '';
    for (let star = 5; star >= 1; star--) {
      const c = dist[star] || 0;
      const pct = count > 0 ? Math.round((c / count) * 100) : 0;
      html += `
        <div class="bar-row">
          <span class="bar-star-label">${star} ★</span>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${pct}%;"></div>
          </div>
          <span class="bar-count">${c}</span>
        </div>
      `;
    }
    barsWrap.innerHTML = html;
  }

  // Reviews List
  const listWrap = document.getElementById('reviewsListWrap');

  if (listWrap) {
    if (!reviews || reviews.length === 0) {
      listWrap.innerHTML = `
        <div class="reviews-empty-state">
          ${isEn ? 'No customer reviews yet for this product.<br><span style="font-size: 0.8rem; opacity: 0.8;">Be the first buyer to review this product after completion!</span>' : 'Belum ada ulasan untuk produk ini.<br><span style="font-size: 0.8rem; opacity: 0.8;">Jadilah pembeli pertama yang memberikan penilaian setelah pesanan Anda lunas!</span>'}
        </div>
      `;
    } else {
      const renderCard = (r) => {
        const initial = (r.author_name || 'U').charAt(0).toUpperCase();
        const dateStr = formatDate(r.created_at);
        const starStr = getStarString(r.rating);
        const verifiedText = isEn ? '✓ Verified Buyer' : '✓ Terverifikasi';
        const defaultAuthor = isEn ? 'Verified Customer' : 'Pelanggan Terverifikasi';
        return `
          <div class="review-item-card">
            <div class="review-item-top">
              <div class="review-author-wrap">
                <div class="review-avatar">${escapeHtml(initial)}</div>
                <div class="review-author-name">${escapeHtml(r.author_name || defaultAuthor)}</div>
                <span class="verified-buyer-badge">${verifiedText}</span>
              </div>
              <div class="review-stars-val">${starStr}</div>
            </div>
            ${r.review_text ? `<div class="review-comment">${escapeHtml(r.review_text)}</div>` : ''}
            <div class="review-date-val">${escapeHtml(dateStr)}</div>
          </div>
        `;
      };

      if (reviews.length <= 5) {
        listWrap.innerHTML = reviews.map(renderCard).join('');
      } else {
        const firstBatch = reviews.slice(0, 5).map(renderCard).join('');
        const remainingBatch = reviews.slice(5).map(renderCard).join('');
        const btnMoreText = isEn ? `View All Reviews (${reviews.length}) ▾` : `Lihat Seluruh Ulasan (${reviews.length}) ▾`;
        listWrap.innerHTML = `
          ${firstBatch}
          <div id="hiddenReviewsContainer" style="display: none;">
            ${remainingBatch}
          </div>
          <div id="moreReviewsWrap" style="text-align: center; margin-top: 1.25rem;">
            <button type="button" id="btnShowMoreReviews" class="btn-nav" style="display: inline-flex; align-items: center; gap: 6px; padding: 0.55rem 1.25rem; font-size: 0.85rem; color: #fbbf24; border-color: rgba(251, 191, 36, 0.35);">
              ${btnMoreText}
            </button>
          </div>
        `;

        document.getElementById('btnShowMoreReviews')?.addEventListener('click', () => {
          const hiddenCont = document.getElementById('hiddenReviewsContainer');
          const btnMore = document.getElementById('btnShowMoreReviews');
          if (hiddenCont) hiddenCont.style.display = 'block';
          if (btnMore) btnMore.parentElement.style.display = 'none';
        });
      }
    }
  }
}

function renderProductDetail(p, stats, reviews) {
  document.getElementById('productLoading').style.display = 'none';
  const detailGrid = document.getElementById('productDetailContent');
  if (detailGrid) {
    detailGrid.style.display = window.innerWidth <= 860 ? 'flex' : 'grid';
  }

  const isEn = (document.documentElement.lang === 'en') || window.location.pathname.startsWith('/en');

  // Page title & Breadcrumb
  document.title = `${p.name} - Digimest`;
  document.getElementById('bcProductName').textContent = p.name;

  // Header
  document.getElementById('dProdLogo').src = p.logo || 'https://via.placeholder.com/76?text=DC';
  const titleEl = document.getElementById('dProdTitle');
  if (titleEl) titleEl.textContent = p.name;
  const slugEl = document.getElementById('dProdSlug');
  if (slugEl) slugEl.textContent = p.slug;

  // Sold count & Reviews
  const soldEl = document.getElementById('dSoldText');
  if (soldEl) soldEl.textContent = `${p.salesCount || 10} ${isEn ? 'sold' : 'terjual'}`;
  renderReviewsSection(stats, reviews);

  // Badges
  document.getElementById('dProdCategory').textContent = p.type || 'Digital License';
  document.getElementById('dProdRegion').textContent = p.region ? p.region : 'Global';
  document.getElementById('dProdWarranty').textContent = p.warranty ? p.warranty : (isEn ? 'Store Warranty' : 'Garansi Toko');

  const isOut = p.stock <= 0 || !!p.isForceOutOfStock;
  const stockText = isOut
    ? (isEn ? 'Out of Stock' : 'Habis')
    : (p.stockCapped ? (isEn ? '>1000 In Stock' : '>1000 Stok') : (isEn ? `${p.stock} In Stock` : `${p.stock} Stok`));
  const stockBadge = document.getElementById('dProdStock');
  stockBadge.textContent = `● ${stockText}`;
  if (isOut) stockBadge.classList.add('empty');

  const dStockNoteEl = document.getElementById('dStockNote');
  if (dStockNoteEl) {
    dStockNoteEl.textContent = isOut ? (isEn ? '● Out of Stock' : '● Stok Habis') : (isEn ? `● Available: ${stockText}` : `● Tersedia: ${stockText}`);
    if (isOut) {
      dStockNoteEl.classList.add('empty');
    } else {
      dStockNoteEl.classList.remove('empty');
    }
  }
  const modalStock = document.getElementById('mModalStockNote');
  if (modalStock) {
    modalStock.textContent = isOut ? (isEn ? 'Out of Stock' : 'Stok Habis') : (isEn ? `Available: ${stockText}` : `Tersedia: ${stockText}`);
    if (isOut) modalStock.style.color = '#f87171';
  }
  if (isOut) {
    const buyBtn = document.getElementById('btnOpenCheckoutFromDetail');
    if (buyBtn) {
      buyBtn.disabled = true;
      buyBtn.textContent = isEn ? 'Product Out of Stock' : 'Stok Produk Habis';
      buyBtn.style.opacity = '0.6';
      buyBtn.style.cursor = 'not-allowed';
    }
    const stickyBtn = document.getElementById('btnStickyBuy');
    if (stickyBtn) {
      stickyBtn.disabled = true;
      stickyBtn.textContent = isEn ? 'Out of Stock' : 'Stok Habis';
      stickyBtn.style.opacity = '0.6';
      stickyBtn.style.cursor = 'not-allowed';
    }
    const modalInput = document.getElementById('modalQtyInput');
    if (modalInput) modalInput.disabled = true;
    const btnMMinus = document.getElementById('btnModalQtyMinus');
    if (btnMMinus) btnMMinus.disabled = true;
    const btnMPlus = document.getElementById('btnModalQtyPlus');
    if (btnMPlus) btnMPlus.disabled = true;
  }

  // Promo Strikethrough & Badges
  const promoStrikeWrap = document.getElementById('dPromoStrikeWrap');
  const stickyStrikeWrap = document.getElementById('mStickyStrikeWrap');

  if (p.hasPromo) {
    if (promoStrikeWrap) {
      promoStrikeWrap.style.display = 'flex';
      document.getElementById('dStrikedPrice').textContent = formatIDR(p.referencePriceIDR);
      document.getElementById('dDiscountBadge').textContent = `-${p.discountPercent}% OFF`;
    }
    if (stickyStrikeWrap) {
      stickyStrikeWrap.style.display = 'flex';
      document.getElementById('mStickyStrikedPrice').textContent = formatIDR(p.referencePriceIDR);
      document.getElementById('mStickyDiscountBadge').textContent = `-${p.discountPercent}%`;
    }
    document.getElementById('dUnitPriceDisplay')?.classList.add('promo-highlight');
  } else {
    if (promoStrikeWrap) promoStrikeWrap.style.display = 'none';
    if (stickyStrikeWrap) stickyStrikeWrap.style.display = 'none';
    document.getElementById('dUnitPriceDisplay')?.classList.remove('promo-highlight');
  }

  // Description
  document.getElementById('dProdDesc').textContent = p.description || 'Lisensi akun premium langsung aktif setelah pembayaran diverifikasi.';

  // Terms Box (Default: Membeli berarti setuju)
  const termsText = p.terms || 'Membeli berarti setuju.';
  document.getElementById('dProdTerms').textContent = termsText;

  updateCalculations();
}

function getEffectiveUnitPrice(qty) {
  if (!currentProduct) return 0;
  let price = currentProduct.priceIDR;
  // Jika produk dikustomisasi oleh admin atau sedang ada promo, harga dari katalog index WAJIB digunakan (tidak boleh ditimpa tiers grosir upstream)
  if (!currentProduct.isCustomized && !currentProduct.hasPromo && currentProduct.tiers && currentProduct.tiers.length > 0) {
    for (const tier of currentProduct.tiers) {
      if (qty >= tier.minQty && (tier.maxQty === null || tier.maxQty === undefined || qty <= tier.maxQty)) {
        if (tier.priceIDR && tier.priceIDR > 0) {
          price = tier.priceIDR;
        }
        break;
      }
    }
  }
  return price;
}

function updateCalculations() {
  if (!currentProduct) return;

  const unitPrice = getEffectiveUnitPrice(currentQty);
  const subtotal = unitPrice * currentQty;

  document.getElementById('dUnitPriceDisplay').textContent = formatIDR(unitPrice);
  document.getElementById('dQtySummary').textContent = `${currentQty} item`;
  document.getElementById('dSubtotalDisplay').textContent = formatIDR(subtotal);

  const stickyPrice = document.getElementById('mStickyPrice');
  if (stickyPrice) stickyPrice.textContent = formatIDR(unitPrice);

  // Modal checkout updates
  const isCrypto = (selectedPaymentMethod === 'BINANCE_PAY' || selectedPaymentMethod === 'CRYPTO');
  const usdRate = appConfig.usd_rate > 0 ? appConfig.usd_rate : 18000;
  const isEn = (document.documentElement.lang === 'en') || window.location.pathname.startsWith('/en');
  const activeCur = window.DigimestCurrency ? window.DigimestCurrency.getCurrency() : 'IDR';
  const isPureUSD = isCrypto || (activeCur === 'USD' && selectedPaymentGateway !== 'PAYMENTG');

  // Voucher discount calculation & minimum spend validation
  let finalTotal = subtotal;
  if (appliedVoucher && appliedVoucher.discountIDR > 0) {
    if (appliedVoucher.minSpendIDR > 0 && subtotal < appliedVoucher.minSpendIDR) {
      const vCode = appliedVoucher.code;
      const vMin = appliedVoucher.minSpendIDR;
      handleCancelVoucher(true);
      const feedback = document.getElementById('voucherFeedback');
      if (feedback) {
        feedback.textContent = `Voucher ${vCode} dibatalkan otomatis: minimal belanja ${formatIDR(vMin)} belum terpenuhi.`;
        feedback.style.color = '#f87171';
        feedback.style.display = 'block';
      }
      showToast(`Voucher ${vCode} dibatalkan karena kuantitas berkurang.`);
      return;
    }

    const effectiveDiscount = Math.min(appliedVoucher.discountIDR, Math.max(0, subtotal - 1000));
    finalTotal = Math.max(1000, subtotal - effectiveDiscount);

    const vRow = document.getElementById('mVoucherRow');
    if (vRow) vRow.style.display = 'flex';
    const vTag = document.getElementById('mVoucherCodeTag');
    if (vTag) vTag.textContent = appliedVoucher.code;
    const vAmount = document.getElementById('mVoucherDiscountAmount');
    if (vAmount) {
      if (isPureUSD) {
        const discUSD = (effectiveDiscount / usdRate).toFixed(2);
        vAmount.textContent = `-$${discUSD} USDT`;
      } else {
        vAmount.textContent = `-${formatIDR(effectiveDiscount)}`;
      }
    }
  } else {
    const vRow = document.getElementById('mVoucherRow');
    if (vRow) vRow.style.display = 'none';
  }

  // Pure USD vs IDR pricing formatting (No IDR leakage for international/crypto buyers)
  let formattedTotal = '';
  if (isPureUSD) {
    const usdAmount = (finalTotal / usdRate).toFixed(2);
    const unitUsd = (unitPrice / usdRate).toFixed(2);
    document.getElementById('mUnitPrice').textContent = `$${unitUsd} USDT`;
    formattedTotal = `$${usdAmount} USDT`;
  } else {
    if (activeCur === 'USD') {
      const usdAmount = (finalTotal / usdRate).toFixed(2);
      const unitUsd = (unitPrice / usdRate).toFixed(2);
      document.getElementById('mUnitPrice').textContent = `$${unitUsd} (~Rp ${Number(unitPrice).toLocaleString('id-ID')})`;
      formattedTotal = `Rp ${Number(finalTotal).toLocaleString('id-ID')} (~$${usdAmount})`;
    } else {
      document.getElementById('mUnitPrice').textContent = 'Rp ' + Number(unitPrice).toLocaleString('id-ID');
      formattedTotal = 'Rp ' + Number(finalTotal).toLocaleString('id-ID');
    }
  }
  document.querySelectorAll('.m-total-price-val, #mTotalPrice').forEach(el => {
    el.textContent = formattedTotal;
  });
  document.getElementById('mQtyDisplay').textContent = `x ${currentQty}`;

  const rateRow = document.getElementById('mSummaryUsdRateRow');
  if (rateRow) {
    rateRow.style.display = (activeCur === 'USD' && selectedPaymentGateway === 'PAYMENTG') ? 'flex' : 'none';
  }

  const btn = document.getElementById('btnConfirmCheckout');
  if (btn && !btn.disabled) {
    if (selectedPaymentMethod === 'BINANCE_PAY') {
      btn.textContent = isEn ? 'Pay Now via Binance Pay' : 'Bayar Sekarang via Binance Pay';
    } else if (selectedPaymentMethod === 'CRYPTO' || selectedPaymentGateway === 'USDT_BEP20') {
      btn.textContent = isEn ? 'Pay Now via USDT (BEP-20)' : 'Bayar Sekarang via USDT (BEP-20)';
    } else {
      btn.textContent = isEn ? 'Pay Now via QRIS' : 'Bayar Sekarang via QRIS';
    }
  }

  const modalQtyInput = document.getElementById('modalQtyInput');
  if (modalQtyInput && parseInt(modalQtyInput.value, 10) !== currentQty) {
    modalQtyInput.value = currentQty;
  }
  updateModalStepperButtons();
}

function updateModalStepperButtons() {
  const btnMinus = document.getElementById('btnModalQtyMinus');
  const btnPlus = document.getElementById('btnModalQtyPlus');
  const maxQty = getMaxAvailableQty();

  if (btnMinus) {
    const isMin = currentQty <= 1;
    btnMinus.disabled = isMin;
    btnMinus.classList.toggle('disabled', isMin);
    if (isMin) {
      btnMinus.setAttribute('aria-disabled', 'true');
    } else {
      btnMinus.removeAttribute('aria-disabled');
    }
  }

  if (btnPlus) {
    const isMax = currentQty >= maxQty;
    btnPlus.disabled = isMax;
    btnPlus.classList.toggle('disabled', isMax);
    if (isMax) {
      btnPlus.setAttribute('aria-disabled', 'true');
    } else {
      btnPlus.removeAttribute('aria-disabled');
    }
  }
}

function openGwSelectorModal() {
  document.getElementById('btnOpenGwSelector')?.classList.add('open');
  document.getElementById('gwSelectorModal')?.classList.add('open');
}

function closeGwSelectorModal() {
  document.getElementById('btnOpenGwSelector')?.classList.remove('open');
  document.getElementById('gwSelectorModal')?.classList.remove('open');
}

function openQrisRegionNoticeModal() {
  const rateText = (appConfig.usd_rate || 18000).toLocaleString('id-ID');
  const rateEl = document.getElementById('qrisNoticeRate');
  if (rateEl) rateEl.textContent = rateText;
  document.getElementById('qrisRegionNoticeModal')?.classList.add('open');
}

function closeQrisRegionNoticeModal() {
  document.getElementById('qrisRegionNoticeModal')?.classList.remove('open');
}

let recalcTimer = null;
function triggerPriceRecalcAnimation(callback) {
  const summaryBox = document.getElementById('orderSummaryBox');
  const totalEls = document.querySelectorAll('.m-total-price-val, #mTotalPrice');
  const vAmount = document.getElementById('mVoucherDiscountAmount');
  const isEn = (document.documentElement.lang === 'en') || window.location.pathname.startsWith('/en');

  if (recalcTimer) clearTimeout(recalcTimer);

  if (totalEls.length > 0) {
    const spinnerHTML = `<span class="price-calc-spinner"><svg class="spin-svg" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none"><circle cx="12" cy="12" r="10" stroke-opacity="0.2"></circle><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path></svg> <span>${isEn ? 'Calculating...' : 'Menghitung...'}</span></span>`;
    totalEls.forEach(el => { el.innerHTML = spinnerHTML; });
  }
  if (vAmount && appliedVoucher) {
    vAmount.innerHTML = `<span class="calc-pulse-dots">•••</span>`;
  }
  if (summaryBox) {
    summaryBox.classList.remove('quote-calculating');
    void summaryBox.offsetWidth;
    summaryBox.classList.add('quote-calculating');
  }

  recalcTimer = setTimeout(() => {
    if (typeof callback === 'function') {
      callback();
    } else {
      updateCalculations();
    }
    if (summaryBox) summaryBox.classList.remove('quote-calculating');
    totalEls.forEach(el => {
      el.classList.remove('price-pop-in');
      void el.offsetWidth;
      el.classList.add('price-pop-in');
    });
    if (vAmount && appliedVoucher) {
      vAmount.classList.remove('price-pop-in');
      void vAmount.offsetWidth;
      vAmount.classList.add('price-pop-in');
    }
  }, 220);
}

function setupPaymentSelectorListeners() {
  const btnOpenSelector = document.getElementById('btnOpenGwSelector');
  const cardSelected = document.getElementById('selectedGatewayCard');
  const btnCloseSelector = document.getElementById('closeGwSelectorBtn');
  const btnCloseQris = document.getElementById('closeQrisNoticeBtn');

  btnOpenSelector?.addEventListener('click', (e) => {
    e.stopPropagation();
    openGwSelectorModal();
  });

  cardSelected?.addEventListener('click', (e) => {
    if (e.target.closest('#btnOpenGwSelector')) return;
    openGwSelectorModal();
  });

  btnCloseSelector?.addEventListener('click', closeGwSelectorModal);
  btnCloseQris?.addEventListener('click', closeQrisRegionNoticeModal);

  // Gateway items in selector modal
  const selQRIS = document.getElementById('selPayQRIS');
  const selBinance = document.getElementById('selPayBinance');
  const selBep20 = document.getElementById('selPayBep20');

  selQRIS?.addEventListener('click', () => {
    if (selectedPaymentGateway === 'PAYMENTG') {
      closeGwSelectorModal();
      return;
    }

    // Rules:
    // 1. Target notice: Non-Indonesian IP ATAU mata uang awal sebelum checkout disetel ke USD.
    // 2. Pengguna Indonesia (mata uang IDR & IP Indo): langsung aktifkan QRIS tanpa interupsi.
    if (shouldShowQrisNotice()) {
      openQrisRegionNoticeModal();
    } else {
      selectPaymentMethod('PAYMENTG', 'QRIS', 'SHOPEEPAY', true);
      setTimeout(closeGwSelectorModal, 80);
    }
  });

  selBinance?.addEventListener('click', () => {
    if (selectedPaymentGateway === 'BINANCE') {
      closeGwSelectorModal();
      return;
    }
    selectPaymentMethod('BINANCE', 'BINANCE_PAY', 'USDT', true);
    setTimeout(closeGwSelectorModal, 80);
  });

  selBep20?.addEventListener('click', () => {
    if (selectedPaymentGateway === 'USDT_BEP20') {
      closeGwSelectorModal();
      return;
    }
    selectPaymentMethod('USDT_BEP20', 'CRYPTO', 'BEP20', true);
    setTimeout(closeGwSelectorModal, 80);
  });

  // Region Notice Modal actions
  const btnConfirmQRIS = document.getElementById('btnConfirmSwitchToQRIS');
  const btnCancelQRIS = document.getElementById('btnCancelSwitchToQRIS');

  btnConfirmQRIS?.addEventListener('click', () => {
    selectPaymentMethod('PAYMENTG', 'QRIS', 'SHOPEEPAY', true);
    closeQrisRegionNoticeModal();
    closeGwSelectorModal();
  });

  btnCancelQRIS?.addEventListener('click', () => {
    closeQrisRegionNoticeModal();
  });
}

function selectPaymentMethod(gateway, method, channel, triggerAnim = false) {
  selectedPaymentGateway = gateway;
  selectedPaymentMethod = method;
  selectedPaymentChannel = channel;

  const isEn = (document.documentElement.lang === 'en') || window.location.pathname.startsWith('/en');

  // Update selector options active states
  const selQRIS = document.getElementById('selPayQRIS');
  const selBinance = document.getElementById('selPayBinance');
  const selBep20 = document.getElementById('selPayBep20');

  selQRIS?.classList.toggle('active', gateway === 'PAYMENTG');
  selBinance?.classList.toggle('active', gateway === 'BINANCE');
  selBep20?.classList.toggle('active', gateway === 'USDT_BEP20');

  // Update active single gateway card
  const activeLogo = document.getElementById('activeGwLogo');
  const activeTitle = document.getElementById('activeGwTitle');
  const activeSubtitle = document.getElementById('activeGwSubtitle');
  const badge = document.getElementById('mCurrencyBadge');
  const sumMethod = document.getElementById('mSummaryPaymentMethod');
  const rateRow = document.getElementById('mSummaryUsdRateRow');

  if (gateway === 'BINANCE' || method === 'BINANCE_PAY') {
    if (activeLogo) {
      activeLogo.src = '/logo/binence.png';
      activeLogo.alt = 'Binance Pay';
    }
    if (activeTitle) activeTitle.textContent = 'Binance Pay (Crypto)';
    if (activeSubtitle) {
      activeSubtitle.textContent = isEn
        ? '0% Gas Fee • Instant Auto-Detect • USD'
        : '0% Gas Fee • Auto Konfirmasi Cepat via Binance App';
    }
    if (badge) {
      badge.textContent = 'USD / USDT';
      badge.style.background = 'rgba(245, 158, 11, 0.15)';
      badge.style.color = '#fbbf24';
    }
    if (sumMethod) {
      sumMethod.textContent = 'Binance Pay (USDT)';
      sumMethod.style.color = '#fbbf24';
    }
    if (rateRow) rateRow.style.display = 'none';
  } else if (gateway === 'USDT_BEP20' || method === 'CRYPTO') {
    if (activeLogo) {
      activeLogo.src = '/logo/usdt.png';
      activeLogo.alt = 'USDT BEP-20';
    }
    if (activeTitle) activeTitle.textContent = 'USDT BEP-20 (BNB Smart Chain)';
    if (activeSubtitle) {
      activeSubtitle.textContent = isEn
        ? 'Decentralized Web3 Transfer • Low Gas'
        : 'Trust Wallet, Metamask, Binance • Low Gas';
    }
    if (badge) {
      badge.textContent = 'USDT (BEP-20)';
      badge.style.background = 'rgba(240, 185, 11, 0.15)';
      badge.style.color = '#f0b90b';
    }
    if (sumMethod) {
      sumMethod.textContent = 'USDT BEP-20 (BSC)';
      sumMethod.style.color = '#f0b90b';
    }
    if (rateRow) rateRow.style.display = 'none';
  } else {
    // Default: QRIS
    if (activeLogo) {
      activeLogo.src = '/logo/kris.png';
      activeLogo.alt = 'QRIS';
    }
    if (activeTitle) {
      activeTitle.textContent = isEn ? 'Instant QRIS (Multi-Bank)' : 'QRIS Instant Multi-Bank';
    }
    if (activeSubtitle) {
      activeSubtitle.textContent = isEn
        ? 'Indonesian Bank & E-Wallets • 0% Fee'
        : 'BCA, Mandiri, BRI, GoPay, OVO, Dana • 0% Fee';
    }
    if (badge) {
      badge.textContent = 'IDR (Rupiah)';
      badge.style.background = 'rgba(16, 185, 129, 0.15)';
      badge.style.color = '#10b981';
    }
    if (sumMethod) {
      sumMethod.textContent = isEn ? 'Instant QRIS (Multi-Bank)' : 'QRIS Instant Multi-Bank';
      sumMethod.style.color = '#60a5fa';
    }
    if (rateRow) {
      const activeCur = window.DigimestCurrency ? window.DigimestCurrency.getCurrency() : 'IDR';
      rateRow.style.display = (activeCur === 'USD') ? 'flex' : 'none';
    }
  }

  if (triggerAnim) {
    triggerPriceRecalcAnimation();
  } else {
    updateCalculations();
  }
}

function getMaxAvailableQty() {
  if (currentProduct && currentProduct.stock > 0 && !currentProduct.stockCapped) {
    return Math.min(currentProduct.stock, 100);
  }
  return 100;
}

function setupEventListeners() {
  const isEn = (document.documentElement.lang === 'en') || window.location.pathname.startsWith('/en');
  setupPaymentSelectorListeners();
  const qtyInput = document.getElementById('detailQtyInput');
  const btnMinus = document.getElementById('btnQtyMinus');
  const btnPlus = document.getElementById('btnQtyPlus');

  btnMinus?.addEventListener('click', () => {
    if (currentQty > 1) {
      currentQty--;
      qtyInput.value = currentQty;
      updateCalculations();
    }
  });

  btnPlus?.addEventListener('click', () => {
    const maxQty = getMaxAvailableQty();
    if (currentQty < maxQty) {
      currentQty++;
      qtyInput.value = currentQty;
      updateCalculations();
    } else if (currentProduct && currentProduct.stock > 0 && currentQty >= currentProduct.stock) {
      showToast(isEn ? `Only ${currentProduct.stock} unit(s) available in stock.` : `Batas stok produk ini tersisa ${currentProduct.stock} unit.`);
    }
  });

  qtyInput?.addEventListener('input', () => {
    const maxQty = getMaxAvailableQty();
    let val = parseInt(qtyInput.value, 10) || 1;
    if (val < 1) val = 1;
    if (val > maxQty) {
      val = maxQty;
      if (currentProduct && currentProduct.stock > 0 && maxQty === currentProduct.stock) {
        showToast(isEn ? `Only ${currentProduct.stock} unit(s) available in stock.` : `Batas stok produk ini tersisa ${currentProduct.stock} unit.`);
      }
    }
    currentQty = val;
    qtyInput.value = val;
    updateCalculations();
  });

  // Modal checkout quantity stepper handlers
  const modalQty = document.getElementById('modalQtyInput');
  const btnModalMinus = document.getElementById('btnModalQtyMinus');
  const btnModalPlus = document.getElementById('btnModalQtyPlus');

  btnModalMinus?.addEventListener('click', () => {
    if (currentQty > 1) {
      currentQty--;
      if (qtyInput) qtyInput.value = currentQty;
      if (modalQty) modalQty.value = currentQty;
      triggerPriceRecalcAnimation();
    }
  });

  btnModalPlus?.addEventListener('click', () => {
    const maxQty = getMaxAvailableQty();
    if (currentQty < maxQty) {
      currentQty++;
      if (qtyInput) qtyInput.value = currentQty;
      if (modalQty) modalQty.value = currentQty;
      triggerPriceRecalcAnimation();
    } else if (currentProduct && currentProduct.stock > 0 && currentQty >= currentProduct.stock) {
      showToast(isEn ? `Only ${currentProduct.stock} unit(s) available in stock.` : `Batas stok produk ini tersisa ${currentProduct.stock} unit.`);
    }
  });

  modalQty?.addEventListener('input', () => {
    const maxQty = getMaxAvailableQty();
    let val = parseInt(modalQty.value, 10) || 1;
    if (val < 1) val = 1;
    if (val > maxQty) {
      val = maxQty;
      if (currentProduct && currentProduct.stock > 0 && maxQty === currentProduct.stock) {
        showToast(isEn ? `Only ${currentProduct.stock} unit(s) available in stock.` : `Batas stok produk ini tersisa ${currentProduct.stock} unit.`);
      }
    }
    currentQty = val;
    modalQty.value = val;
    if (qtyInput) qtyInput.value = val;
    triggerPriceRecalcAnimation();
  });

  // Email input real-time validation handler to clear inline error on typing
  const emailInput = document.getElementById('emailInput');
  emailInput?.addEventListener('input', () => {
    const errEl = document.getElementById('emailInputError');
    if (errEl) {
      errEl.style.display = 'none';
      errEl.textContent = '';
    }
    emailInput.style.borderColor = '';
  });

  // Voucher handlers
  document.getElementById('btnApplyVoucher')?.addEventListener('click', handleApplyVoucher);
  document.getElementById('btnCancelVoucher')?.addEventListener('click', handleCancelVoucher);
  document.getElementById('voucherInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApplyVoucher();
    }
  });

  // Modal Checkout Trigger
  document.getElementById('btnOpenCheckoutFromDetail')?.addEventListener('click', openCheckoutModal);
  document.getElementById('btnStickyBuy')?.addEventListener('click', openCheckoutModal);
  document.getElementById('closeCheckoutBtn')?.addEventListener('click', closeCheckoutModal);

  // Submit Checkout
  document.getElementById('btnConfirmCheckout')?.addEventListener('click', submitCheckout);

  // History Drawer
  document.getElementById('btnOpenHistory')?.addEventListener('click', openHistoryModal);
  document.getElementById('closeHistoryBtn')?.addEventListener('click', closeHistoryModal);

  // Smooth scroll to customer reviews section
  document.getElementById('dRatingLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.getElementById('customerReviewsSection');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  // Close modals on background click (isolated by modal id)
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      if (e.target.id === 'qrisRegionNoticeModal') {
        closeQrisRegionNoticeModal();
      } else if (e.target.id === 'gwSelectorModal') {
        closeGwSelectorModal();
      } else if (e.target.id === 'checkoutModal') {
        closeCheckoutModal();
      } else if (e.target.id === 'historyModal') {
        closeHistoryModal();
      }
    }
  });

  // Close modals on Escape key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (document.getElementById('qrisRegionNoticeModal')?.classList.contains('open')) {
        closeQrisRegionNoticeModal();
      } else if (document.getElementById('gwSelectorModal')?.classList.contains('open')) {
        closeGwSelectorModal();
      } else if (document.getElementById('checkoutModal')?.classList.contains('open')) {
        closeCheckoutModal();
      } else if (document.getElementById('historyModal')?.classList.contains('open')) {
        closeHistoryModal();
      }
    }
  });

  // Automatically update checkout gateway when currency is switched in header
  window.addEventListener('currencychange', (e) => {
    const newCur = e.detail?.currency;
    if (newCur === 'USD') {
      selectPaymentMethod('BINANCE', 'BINANCE_PAY', 'USDT', true);
    } else {
      selectPaymentMethod('PAYMENTG', 'QRIS', 'SHOPEEPAY', true);
    }
  });
}

async function handleApplyVoucher() {
  if (!currentProduct) return;
  const isEn = (document.documentElement.lang === 'en') || window.location.pathname.startsWith('/en');
  const input = document.getElementById('voucherInput');
  const code = (input?.value || '').trim().toUpperCase();
  const feedback = document.getElementById('voucherFeedback');
  const btnApply = document.getElementById('btnApplyVoucher');

  if (!code) {
    if (feedback) {
      feedback.textContent = isEn ? 'Please enter a voucher code first.' : 'Silakan ketik kode voucher terlebih dahulu.';
      feedback.className = 'voucher-feedback feedback-error';
      feedback.style.display = 'block';
    }
    input?.focus();
    return;
  }

  btnApply.disabled = true;
  btnApply.textContent = isEn ? 'Checking...' : 'Memeriksa...';
  if (feedback) feedback.style.display = 'none';

  try {
    const validateUrl = window.digimestApi ? window.digimestApi('/api/vouchers/validate') : '/api/vouchers/validate';
    const res = await fetch(validateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: code,
        product_slug: currentProduct.slug,
        quantity: currentQty
      })
    });

    const json = await res.json();
    if (json.success && json.data && json.data.valid) {
      appliedVoucher = {
        code: json.data.code,
        discountIDR: json.data.discount_idr,
        minSpendIDR: json.data.min_spend_idr || 0
      };

      if (feedback) {
        feedback.textContent = `✓ ${json.data.message || (isEn ? 'Voucher applied successfully!' : 'Voucher berhasil diterapkan!')}`;
        feedback.className = 'voucher-feedback feedback-success';
        feedback.style.display = 'block';
      }

      input.disabled = true;
      btnApply.style.display = 'none';
      const btnCancel = document.getElementById('btnCancelVoucher');
      if (btnCancel) {
        btnCancel.textContent = isEn ? '✕ Remove' : '✕ Batalkan';
        btnCancel.style.display = 'inline-flex';
      }
      const statusTag = document.getElementById('voucherStatusTag');
      if (statusTag) {
        statusTag.textContent = `${isEn ? 'Active' : 'Aktif'} (${json.data.code})`;
        statusTag.style.display = 'inline';
      }

      triggerPriceRecalcAnimation();
      showToast(isEn ? `Voucher ${json.data.code} applied!` : `Voucher ${json.data.code} berhasil diterapkan!`);
    } else {
      appliedVoucher = null;
      if (feedback) {
        feedback.textContent = `✕ ${json.error || (isEn ? 'Voucher is invalid or limit reached' : 'Kode voucher tidak valid atau kuota telah habis')}`;
        feedback.className = 'voucher-feedback feedback-error';
        feedback.style.display = 'block';
      }
      triggerPriceRecalcAnimation();
    }
  } catch (err) {
    if (feedback) {
      feedback.textContent = isEn ? 'Failed to connect to voucher validation server.' : 'Gagal menghubungi server validasi voucher.';
      feedback.className = 'voucher-feedback feedback-error';
      feedback.style.display = 'block';
    }
  } finally {
    btnApply.disabled = false;
    btnApply.textContent = isEn ? 'Apply' : 'Terapkan';
  }
}

function handleCancelVoucher(keepFeedbackMsg = false) {
  appliedVoucher = null;
  const isEn = (document.documentElement.lang === 'en') || window.location.pathname.startsWith('/en');
  const input = document.getElementById('voucherInput');
  if (input) {
    input.disabled = false;
    input.value = '';
    if (!keepFeedbackMsg) input.focus();
  }
  const btnApply = document.getElementById('btnApplyVoucher');
  if (btnApply) {
    btnApply.disabled = false;
    btnApply.textContent = isEn ? 'Apply' : 'Terapkan';
    btnApply.style.display = 'inline-flex';
  }
  const btnCancel = document.getElementById('btnCancelVoucher');
  if (btnCancel) btnCancel.style.display = 'none';
  const feedback = document.getElementById('voucherFeedback');
  if (feedback && !keepFeedbackMsg) {
    feedback.className = 'voucher-feedback';
    feedback.style.display = 'none';
  }
  const statusTag = document.getElementById('voucherStatusTag');
  if (statusTag) statusTag.style.display = 'none';

  triggerPriceRecalcAnimation();
}

function openCheckoutModal() {
  if (!currentProduct) return;
  const isEn = (document.documentElement.lang === 'en') || window.location.pathname.startsWith('/en');

  if (currentProduct.stock <= 0 || currentProduct.isForceOutOfStock) {
    showToast(isEn ? 'Sorry, this product is currently out of stock.' : 'Mohon maaf, stok produk ini sedang habis atau dinonaktifkan sementara.');
    return;
  }
  const modal = document.getElementById('checkoutModal');
  document.getElementById('mProdName').textContent = currentProduct.name;
  document.getElementById('mProdType').textContent = currentProduct.type || 'Digital License';
  document.getElementById('mProdLogo').src = currentProduct.logo || 'https://via.placeholder.com/40';

  const emailInput = document.getElementById('emailInput');
  const savedEmail = localStorage.getItem('digimest_saved_email') || localStorage.getItem('digihub_saved_email') || localStorage.getItem('storeku_saved_email');
  if (emailInput && savedEmail) {
    emailInput.value = savedEmail;
  }

  // Smart default gateway: IDR -> QRIS, USD -> Binance Pay
  const activeCur = window.DigimestCurrency ? window.DigimestCurrency.getCurrency() : 'IDR';
  initialCheckoutCurrency = activeCur;
  if (activeCur === 'USD') {
    selectPaymentMethod('BINANCE', 'BINANCE_PAY', 'USDT', false);
  } else {
    selectPaymentMethod('PAYMENTG', 'QRIS', 'SHOPEEPAY', false);
  }

  updateCalculations();
  const modalBody = modal?.querySelector('.checkout-modal-body');
  if (modalBody) modalBody.scrollTop = 0;
  modal?.classList.add('open');
  document.body.classList.add('modal-open');

  // Only auto-focus email on desktop to avoid squishing the modal on mobile touchscreens
  if (emailInput && !emailInput.value && window.innerWidth > 768) {
    setTimeout(() => emailInput.focus(), 150);
  }
}

function closeCheckoutModal() {
  closeGwSelectorModal();
  closeQrisRegionNoticeModal();
  document.getElementById('checkoutModal')?.classList.remove('open');
  document.body.classList.remove('modal-open');
}

async function submitCheckout() {
  if (!currentProduct) return;
  const isEn = (document.documentElement.lang === 'en') || window.location.pathname.startsWith('/en');

  const btn = document.getElementById('btnConfirmCheckout');
  const emailInput = document.getElementById('emailInput');
  const emailErr = document.getElementById('emailInputError');
  const email = (emailInput?.value || '').trim();
  const contact = (document.getElementById('contactInput')?.value || '').trim();

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailPattern.test(email)) {
    const errMsg = isEn ? 'Please enter a valid email address for digital license delivery!' : 'Silakan masukkan alamat email yang valid untuk pengiriman kode klaim!';
    if (emailErr) {
      emailErr.textContent = errMsg;
      emailErr.style.display = 'block';
    }
    if (emailInput) {
      emailInput.style.borderColor = '#ef4444';
      emailInput.focus();
      try {
        emailInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (e) {}
    }
    showToast(errMsg);
    return;
  }

  const isBinance = (selectedPaymentMethod === 'BINANCE_PAY');
  const isBep20 = (selectedPaymentGateway === 'USDT_BEP20' || selectedPaymentMethod === 'CRYPTO');
  btn.disabled = true;
  if (isBinance) {
    btn.innerText = isEn ? 'Preparing Binance Pay...' : 'Menyiapkan Binance Pay (USDT)...';
  } else if (isBep20) {
    btn.innerText = isEn ? 'Preparing USDT (BEP-20)...' : 'Menyiapkan USDT (BEP-20)...';
  } else {
    btn.innerText = isEn ? 'Preparing Instant QRIS...' : 'Menyiapkan QRIS ShopeePay...';
  }

  const defaultBtnText = isBinance
    ? (isEn ? 'Pay Now via Binance Pay ➔' : 'Bayar Sekarang via Binance Pay ➔')
    : (isBep20
        ? (isEn ? 'Pay Now via USDT (BEP-20) ➔' : 'Bayar Sekarang via USDT (BEP-20) ➔')
        : (isEn ? 'Pay Now via QRIS ➔' : 'Bayar Sekarang via QRIS ➔'));

  try {
    const checkoutUrl = window.digimestApi ? window.digimestApi('/api/checkout') : '/api/checkout';
    const res = await fetch(checkoutUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_slug: currentProduct.slug,
        quantity: currentQty,
        customer_email: email,
        customer_contact: contact,
        voucher_code: appliedVoucher ? appliedVoucher.code : '',
        payment_gateway: selectedPaymentGateway,
        payment_method: selectedPaymentMethod,
        payment_channel: selectedPaymentChannel
      })
    });

    const data = await res.json();
    if (!data.success) {
      const errMsg = isEn ? ('Failed to create order: ' + (data.error || 'An error occurred')) : ('Gagal membuat pesanan: ' + (data.error || 'Terjadi kesalahan'));
      showToast(errMsg);
      btn.disabled = false;
      btn.innerText = defaultBtnText;
      return;
    }

    const order = data.data;

    // SAVE EMAIL & ORDER TO LOCAL STORAGE!
    localStorage.setItem('digimest_saved_email', email); localStorage.setItem('digihub_saved_email', email);
    localStorage.setItem('storeku_saved_email', email);
    if ((window.DigimestOrders || window.DigihubOrders)) {
      (window.DigimestOrders || window.DigihubOrders).saveOrder({
        invoice_number: order.invoice_number,
        claim_code: order.claim_code,
        product_name: order.product_name,
        quantity: order.quantity,
        total_amount: order.total_amount,
        crypto_amount_str: order.crypto_amount_str || '',
        crypto_currency: order.crypto_currency || '',
        payment_gateway: order.payment_gateway || selectedPaymentGateway,
        payment_method: order.payment_method || selectedPaymentMethod,
        customer_email: email,
        payment_status: 'PENDING',
        expires_at: order.expires_at,
        created_at: new Date().toISOString()
      });
    }

    // Redirect to Payment Screen (Clean URL, matching current language)
    const paymentPath = isEn ? '/en/payment' : '/payment';
    window.location.href = `${paymentPath}?inv=${encodeURIComponent(order.invoice_number)}`;

  } catch (err) {
    console.error('Checkout error:', err);
    showToast(isEn ? 'Network error occurred during checkout.' : 'Terjadi kesalahan jaringan saat checkout.');
    btn.disabled = false;
    btn.innerText = defaultBtnText;
  }
}

// LocalStorage Order History (Delegates to unified StoreKuOrders)
function saveHistoryItem(item) {
  if (window.StoreKuOrders) {
    StoreKuOrders.saveOrder(item);
  }
}

function openHistoryModal() {
  if (window.StoreKuOrders) {
    StoreKuOrders.renderHistoryList('historyListContainer');
  }
  document.getElementById('historyModal')?.classList.add('open');
}

function closeHistoryModal() {
  document.getElementById('historyModal')?.classList.remove('open');
}

// Reactive Currency Switcher Listener for Product Detail
window.addEventListener('currencychange', () => {
  if (currentProduct) {
    const promoStrikeWrap = document.getElementById('dPromoStrikeWrap');
    const stickyStrikeWrap = document.getElementById('mStickyStrikeWrap');
    if (currentProduct.hasPromo) {
      if (promoStrikeWrap) {
        const dStrike = document.getElementById('dStrikedPrice');
        if (dStrike) dStrike.textContent = formatCurrency(currentProduct.referencePriceIDR);
      }
      if (stickyStrikeWrap) {
        const mStrike = document.getElementById('mStickyStrikedPrice');
        if (mStrike) mStrike.textContent = formatCurrency(currentProduct.referencePriceIDR);
      }
    }
    updateCalculations();
  }
});
