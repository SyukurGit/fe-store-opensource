// Digimest Product Detail JavaScript
let currentProduct = null;
let currentQty = 1;

document.addEventListener('DOMContentLoaded', () => {
  initProductPage();
  setupEventListeners();
});

function formatIDR(num) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(num);
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

async function initProductPage() {
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
        renderProductDetail(currentProduct);
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
        renderProductDetail(currentProduct);
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

function renderProductDetail(p) {
  document.getElementById('productLoading').style.display = 'none';
  document.getElementById('productDetailContent').style.display = 'grid';

  // Page title & Breadcrumb
  document.title = `${p.name} - Digimest`;
  document.getElementById('bcProductName').textContent = p.name;

  // Header
  document.getElementById('dProdLogo').src = p.logo || 'https://via.placeholder.com/76?text=DC';
  document.getElementById('dProdTitle').textContent = p.name;
  document.getElementById('dProdSlug').textContent = p.slug;

  // Badges
  document.getElementById('dProdCategory').textContent = p.type || 'Digital License';
  document.getElementById('dProdRegion').textContent = p.region ? `🌐 ${p.region}` : '🌐 Global';
  document.getElementById('dProdWarranty').textContent = p.warranty ? `🛡️ ${p.warranty}` : '🛡️ Garansi Toko';

  const isOut = p.stock <= 0 || !!p.isForceOutOfStock;
  const stockText = isOut ? 'Habis' : (p.stockCapped ? '>1000 Stok' : `${p.stock} Stok`);
  const stockBadge = document.getElementById('dProdStock');
  stockBadge.textContent = `● ${stockText}`;
  if (isOut) stockBadge.classList.add('empty');

  document.getElementById('dStockNote').textContent = isOut ? 'Stok Habis' : `Tersedia: ${stockText}`;
  if (isOut) {
    document.getElementById('dStockNote').style.color = '#f87171';
    const buyBtn = document.getElementById('btnOpenCheckoutFromDetail');
    if (buyBtn) {
      buyBtn.disabled = true;
      buyBtn.textContent = 'Stok Produk Habis';
      buyBtn.style.opacity = '0.6';
      buyBtn.style.cursor = 'not-allowed';
    }
    const stickyBtn = document.getElementById('btnStickyBuy');
    if (stickyBtn) {
      stickyBtn.disabled = true;
      stickyBtn.textContent = 'Stok Habis';
      stickyBtn.style.opacity = '0.6';
      stickyBtn.style.cursor = 'not-allowed';
    }
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
  document.getElementById('mUnitPrice').textContent = formatIDR(unitPrice);
  document.getElementById('mQtyDisplay').textContent = `x ${currentQty}`;
  document.getElementById('mTotalPrice').textContent = formatIDR(subtotal);
}

function setupEventListeners() {
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
    if (currentQty < 100) {
      currentQty++;
      qtyInput.value = currentQty;
      updateCalculations();
    }
  });

  qtyInput?.addEventListener('input', () => {
    let val = parseInt(qtyInput.value, 10) || 1;
    if (val < 1) val = 1;
    if (val > 100) val = 100;
    currentQty = val;
    qtyInput.value = val;
    updateCalculations();
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

  // Close modals on background click
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      closeCheckoutModal();
      closeHistoryModal();
    }
  });
}

function openCheckoutModal() {
  if (!currentProduct) return;
  if (currentProduct.stock <= 0 || currentProduct.isForceOutOfStock) {
    alert('Mohon maaf, stok produk ini sedang habis atau dinonaktifkan sementara.');
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

  updateCalculations();
  modal?.classList.add('open');

  if (emailInput && !emailInput.value) {
    setTimeout(() => emailInput.focus(), 150);
  }
}

function closeCheckoutModal() {
  document.getElementById('checkoutModal')?.classList.remove('open');
}

async function submitCheckout() {
  if (!currentProduct) return;

  const btn = document.getElementById('btnConfirmCheckout');
  const email = (document.getElementById('emailInput')?.value || '').trim();
  const contact = (document.getElementById('contactInput')?.value || '').trim();

  if (!email || !email.includes('@') || !email.includes('.')) {
    alert('Silakan masukkan alamat email yang valid untuk pengiriman kode klaim!');
    document.getElementById('emailInput')?.focus();
    return;
  }

  btn.disabled = true;
  btn.innerText = 'Menyiapkan QRIS ShopeePay...';

  try {
    const checkoutUrl = window.digimestApi ? window.digimestApi('/api/checkout') : '/api/checkout';
    const res = await fetch(checkoutUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_slug: currentProduct.slug,
        quantity: currentQty,
        customer_email: email,
        customer_contact: contact
      })
    });

    const data = await res.json();
    if (!data.success) {
      alert('Gagal membuat pesanan: ' + (data.error || 'Terjadi kesalahan'));
      btn.disabled = false;
      btn.innerText = 'Bayar Sekarang via QRIS ➔';
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
        customer_email: email,
        payment_status: 'PENDING',
        expires_at: order.expires_at,
        created_at: new Date().toISOString()
      });
    }

    // Redirect to Payment Screen (Clean URL)
    window.location.href = `/payment?inv=${encodeURIComponent(order.invoice_number)}`;

  } catch (err) {
    console.error('Checkout error:', err);
    alert('Terjadi kesalahan jaringan saat checkout.');
    btn.disabled = false;
    btn.innerText = 'Bayar Sekarang via QRIS ➔';
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
