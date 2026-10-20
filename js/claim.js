// Digimest License Claim Engine

function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

function copyText(text) {
  const isEn = (document.documentElement && document.documentElement.lang === 'en') || (window.location.pathname.startsWith('/en'));
  navigator.clipboard.writeText(text).then(() => {
    showToast(isEn ? 'Copied to clipboard! 📋' : 'Berhasil disalin! 📋');
  }).catch(() => {
    showToast(isEn ? 'Failed to copy.' : 'Gagal menyalin.');
  });
}

async function doClaim(queryCode) {
  const loading = document.getElementById('claimLoading');
  const errBox = document.getElementById('claimError');
  const resultBox = document.getElementById('claimResult');

  const isEn = (document.documentElement && document.documentElement.lang === 'en') || (window.location.pathname.startsWith('/en'));
  const catalogUrl = isEn ? '/en/' : '/';

  if (loading) loading.style.display = 'block';
  if (errBox) errBox.style.display = 'none';
  if (resultBox) resultBox.style.display = 'none';

  try {
    const claimUrl = window.digimestApi ? window.digimestApi(`/api/claim?code=${encodeURIComponent(queryCode)}`) : `/api/claim?code=${encodeURIComponent(queryCode)}`;
    const res = await fetch(claimUrl);
    const data = await res.json();

    if (loading) loading.style.display = 'none';

    if (!res.ok || !data.success) {
      if (errBox) {
        const notFoundText = isEn ? 'Order with that code was not found.' : 'Pesanan dengan kode tersebut tidak ditemukan.';
        const backText = isEn ? '← Back to Store Catalog' : '← Kembali ke Katalog Toko';
        errBox.innerHTML = `
          <div>${escapeHtml(data.error || notFoundText)}</div>
          <div style="margin-top: 10px;">
            <a href="${catalogUrl}" style="color: #60a5fa; text-decoration: underline; font-weight: 600; font-size: 0.82rem;">${backText}</a>
          </div>
        `;
        errBox.style.display = 'block';
      }
      return;
    }

    renderClaimResult(data);
  } catch (err) {
    if (loading) loading.style.display = 'none';
    if (errBox) {
      const connFailText = isEn ? 'Connection failed: ' : 'Koneksi gagal: ';
      const backText = isEn ? '← Back to Store Catalog' : '← Kembali ke Katalog Toko';
      errBox.innerHTML = `
        <div>${connFailText}${escapeHtml(err.message)}</div>
        <div style="margin-top: 10px;">
          <a href="${catalogUrl}" style="color: #60a5fa; text-decoration: underline; font-weight: 600; font-size: 0.82rem;">${backText}</a>
        </div>
      `;
      errBox.style.display = 'block';
    }
  }
}

function renderClaimResult(data) {
  const resultBox = document.getElementById('claimResult');
  if (resultBox) resultBox.style.display = 'block';

  // Sync to local order history
  const orderHandler = window.DigimestOrders || window.StoreKuOrders || window.DigihubOrders;
  if (orderHandler && data.invoice_number) {
    try {
      orderHandler.saveOrder({
        invoice_number: data.invoice_number,
        claim_code: data.claim_code,
        product_name: data.product_name,
        quantity: data.quantity,
        payment_status: data.payment_status,
        created_at: data.created_at
      });
    } catch (e) {
      console.warn('Failed to save order to history:', e);
    }
  }

  const prodNameEl = document.getElementById('resProductName');
  if (prodNameEl) {
    prodNameEl.textContent = `${data.product_name || 'Produk Digital'} (${data.quantity || 1} item)`;
  }

  const invoiceEl = document.getElementById('resInvoice');
  const isEn = (document.documentElement && document.documentElement.lang === 'en') ||
               (window.location.pathname.startsWith('/en'));
  const catalogUrl = isEn ? '/en/' : '/';
  const paymentPath = isEn ? '/en/payment' : '/payment';

  if (invoiceEl) {
    invoiceEl.textContent = data.claim_code
      ? `Invoice: ${data.invoice_number} | ${isEn ? 'Order Reference' : 'Kode Pesanan'}: ${data.claim_code}`
      : `Invoice: ${data.invoice_number}`;
  }

  const statusBadge = document.getElementById('resStatusBadge');
  const isRefunded = data.fulfillment_status === 'REFUNDED';
  const isExpired = data.payment_status === 'EXPIRED';
  const isCancelled = data.payment_status === 'CANCELLED';
  const isCrypto = (data.payment_gateway === 'BINANCE_PAY' || data.payment_gateway === 'USDT_BEP20' || data.payment_method === 'CRYPTO' || data.payment_method === 'BINANCE_PAY');

  if (statusBadge) {
    // Reset any custom inline style colors from previous renders
    statusBadge.style.color = '';
    statusBadge.style.borderColor = '';

    if (isRefunded) {
      statusBadge.className = 'badge badge-region';
      statusBadge.style.color = '#94a3b8';
      statusBadge.style.borderColor = 'rgba(148, 163, 184, 0.4)';
      statusBadge.textContent = isEn ? '● REFUNDED' : '● DANA DIREFUND';
    } else if (isExpired) {
      statusBadge.className = 'badge badge-stock empty';
      statusBadge.textContent = isEn ? '● INVOICE EXPIRED' : '● TAGIHAN KADALUARSA';
    } else if (isCancelled) {
      statusBadge.className = 'badge badge-stock empty';
      statusBadge.textContent = isEn ? '● ORDER CANCELLED' : '● ORDER DIBATALKAN';
    } else if (data.payment_status === 'PAID') {
      statusBadge.className = 'badge badge-stock';
      statusBadge.textContent = isEn ? '● COMPLETED / READY' : '● PEMBAYARAN LUNAS (SIAP PAKAI)';
    } else {
      statusBadge.className = 'badge badge-region';
      statusBadge.textContent = isEn ? '● AWAITING PAYMENT' : '● MENUNGGU PEMBAYARAN';
    }
  }

  const itemsContainer = document.getElementById('resItemsContainer');
  const items = data.delivered_items || [];

  if (itemsContainer) {
    if (isRefunded) {
      itemsContainer.innerHTML = `
        <div style="background: rgba(148, 163, 184, 0.08); border: 1px solid rgba(148, 163, 184, 0.25); border-radius: 12px; padding: 16px; text-align: center;">
          <div style="font-size: 1.8rem; margin-bottom: 6px;">💸</div>
          <div style="font-weight: 700; color: #cbd5e1; font-size: 1rem; margin-bottom: 6px;">${isEn ? 'Transaction Refunded' : 'Dana Transaksi Telah Direfund'}</div>
          <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.5; margin-bottom: 12px;">
            ${isEn ? 'This order was resolved with a refund by admin. If you have questions, please contact our support.' : 'Pesanan ini telah diselesaikan dengan pengembalian dana (refund) oleh admin. Jika ada pertanyaan, hubungi CS kami.'}
          </p>
          <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
            <a href="${catalogUrl}" class="btn-buy" style="text-decoration: none; padding: 6px 16px; font-size: 0.82rem;">${isEn ? 'Store Catalog ➔' : 'Katalog Toko ➔'}</a>
            <a href="https://t.me/Digimestsupport" target="_blank" rel="noopener" class="btn-nav" style="text-decoration: none; padding: 6px 14px; font-size: 0.82rem;" data-tele-cs>${isEn ? 'Telegram Support' : 'Hubungi CS Telegram'}</a>
          </div>
        </div>
      `;
    } else if (isExpired) {
      itemsContainer.innerHTML = `
        <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 12px; padding: 16px; text-align: center;">
          <div style="font-size: 1.8rem; margin-bottom: 6px;">⌛</div>
          <div style="font-weight: 700; color: #f87171; font-size: 1rem; margin-bottom: 6px;">${isEn ? 'Payment Window Expired' : 'Batas Waktu Pembayaran Telah Habis'}</div>
          <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.5; margin-bottom: 12px;">
            ${isEn
              ? `The ${isCrypto ? 'crypto' : '15-minute QRIS'} payment window has expired. Please place a new order in our store catalog.`
              : `Batas waktu pembayaran ${isCrypto ? 'Crypto' : 'QRIS 15 menit'} untuk pesanan ini telah kedaluwarsa. Silakan lakukan pemesanan baru di katalog toko.`}
          </p>
          <a href="${catalogUrl}" class="btn-buy" style="display: inline-block; text-decoration: none; padding: 7px 20px; font-size: 0.85rem;">
            ${isEn ? 'Reorder from Catalog ➔' : 'Pesan Ulang di Katalog Toko ➔'}
          </a>
        </div>
      `;
    } else if (isCancelled) {
      itemsContainer.innerHTML = `
        <div style="background: rgba(148, 163, 184, 0.08); border: 1px solid rgba(148, 163, 184, 0.25); border-radius: 12px; padding: 16px; text-align: center;">
          <div style="font-size: 1.8rem; margin-bottom: 6px;">✕</div>
          <div style="font-weight: 700; color: #94a3b8; font-size: 1rem; margin-bottom: 6px;">${isEn ? 'Order Cancelled by Customer' : 'Pesanan Dibatalkan Oleh Pembeli'}</div>
          <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.5; margin-bottom: 12px;">
            ${isEn
              ? 'This transaction has been cancelled and the payment invoice has been deactivated. You can place a new order anytime.'
              : 'Transaksi ini telah dibatalkan dan tagihan pembayaran telah dinonaktifkan. Anda dapat membuat pesanan baru kapan saja.'}
          </p>
          <a href="${catalogUrl}" class="btn-buy" style="display: inline-block; text-decoration: none; padding: 7px 20px; font-size: 0.85rem;">
            ${isEn ? 'Back to Store Catalog ➔' : 'Kembali ke Katalog Toko ➔'}
          </a>
        </div>
      `;
    } else if (data.fulfillment_status === 'PENDING_MANUAL_DELIVERY') {
      if (statusBadge) {
        statusBadge.className = 'badge badge-stock';
        statusBadge.textContent = isEn ? '● PAID (PREPARING PRODUCT)' : '● PEMBAYARAN LUNAS (SEDANG DISIAPKAN)';
      }
      itemsContainer.innerHTML = `
        <div style="background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 12px; padding: 20px; text-align: center;">
          <div style="font-size: 1.8rem; margin-bottom: 8px;">📦</div>
          <div style="font-weight: 700; color: #a5b4fc; font-size: 1.05rem; margin-bottom: 8px;">${isEn ? 'Payment Verified! Product Is Being Prepared' : 'Pembayaran Lunas! Produk Sedang Disiapkan'}</div>
          <p style="color: var(--text-muted); font-size: 0.88rem; line-height: 1.6; margin-bottom: 16px;">
            ${isEn
              ? `We have received your payment. Your digital product details for this order are being prepared by our store admin. Click the button below to contact Customer Service via Telegram (Invoice <strong>${escapeHtml(data.invoice_number)}</strong>) or wait for confirmation to be sent to your email.`
              : `Pembayaran Anda telah kami terima dengan sukses. Rincian produk digital untuk pesanan ini sedang disiapkan oleh admin toko. Silakan klik tombol di bawah untuk menghubungi Customer Service via Telegram (sebutkan Invoice <strong>${escapeHtml(data.invoice_number)}</strong>) atau tunggu informasi pesanan dikirimkan ke email Anda.`}
          </p>
          <a href="https://t.me/Digimestsupport" target="_blank" rel="noopener" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px; font-size: 0.88rem; padding: 10px 20px;" data-tele-cs>
            <span>${isEn ? 'Contact CS via Telegram' : 'Hubungi CS via Telegram'}</span> ➔
          </a>
        </div>
      `;
    } else if (data.is_quota_out || data.fulfillment_status === 'HOLD_PRICE_SPIKE' || data.fulfillment_status === 'HOLD_INSUFFICIENT_BOT_BALANCE' || data.fulfillment_status === 'FAILED') {
      const isFailed = data.fulfillment_status === 'FAILED' || data.fulfillment_status === 'HOLD_INSUFFICIENT_BOT_BALANCE';
      const title = isEn
        ? (isFailed ? 'Payment Verified — Preparing Product Allocation' : 'Payment Verified — Waiting for Stock')
        : (isFailed ? 'Pembayaran Sukses — Produk Sedang Disiapkan Admin' : 'Pembayaran Sukses — Menunggu Alokasi Stok');
      const defaultMsg = isEn
        ? "Your payment was successfully received. The digital product for this order is currently being assigned by our admin team on priority queue (usually 5–15 mins). Your funds are 100% safe and protected! Click below to confirm directly with our Customer Support."
        : "Pembayaran Anda telah sukses kami terima. Produk digital pesanan ini sedang disiapkan dan dialokasikan oleh tim admin dalam antrean prioritas (biasanya 5–15 menit). Dana Anda 100% aman dan terjamin! Klik tombol di bawah untuk konfirmasi langsung ke Customer Service kami.";

      const teleText = encodeURIComponent(isEn 
        ? `Hello Admin Digimest, I need assistance with my order ${data.invoice_number || ''} (${data.product_name || 'Product'}).`
        : `Halo Admin Digimest, saya ingin konfirmasi pesanan Invoice ${data.invoice_number || ''} (${data.product_name || 'Produk'}).`);
      const teleUrl = `https://t.me/Digimestsupport?text=${teleText}`;

      if (statusBadge) {
        statusBadge.className = 'badge badge-region';
        statusBadge.style.color = '#34d399';
        statusBadge.style.borderColor = 'rgba(16,185,129,0.4)';
        statusBadge.textContent = isEn
          ? '● FUNDS 100% SAFE (PROCESSING)'
          : '● DANA 100% AMAN (DIPROSES)';
      }

      itemsContainer.innerHTML = `
        <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; padding: 18px; text-align: center;">
          <div style="display: inline-flex; align-items: center; gap: 6px; font-size: 0.76rem; font-weight: 800; color: #34d399; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.35); padding: 3px 10px; border-radius: 999px; margin-bottom: 10px;">
            <span>🛡️</span> ${isEn ? 'FUNDS 100% SAFE • SYSTEM PRIORITY' : 'DANA 100% AMAN • PRIORITAS SISTEM'}
          </div>
          <div style="font-weight: 700; color: #fbbf24; font-size: 1.05rem; margin-bottom: 8px;">${title}</div>
          <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.55; margin-bottom: 14px;">
            ${escapeHtml(data.quota_out_message || defaultMsg)}
          </p>
          <a href="${teleUrl}" target="_blank" rel="noopener" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-size: 0.88rem; font-weight: 700; color: #ffffff !important; background: linear-gradient(135deg, #2563eb, #7c3aed); border: none; border-radius: 8px; padding: 10px 20px; text-decoration: none; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);" data-tele-cs>
            <span>💬 ${isEn ? 'Chat Telegram Support' : 'Hubungi Admin via Telegram'}</span> ➔
          </a>
        </div>
      `;
    } else if (items.length === 0) {
      if (data.payment_status === 'PAID') {
        itemsContainer.innerHTML = `
          <div style="background: rgba(245,158,11,0.1); padding: 12px; border-radius: 8px; color: #fbbf24; font-size: 0.85rem;">
            ${isEn ? 'Your payment has been received. Your digital product is being processed by the system queue within 1-2 minutes.' : 'Pembayaran Anda telah diterima. Produk digital Anda sedang diproses oleh antrean sistem dalam 1-2 menit.'}
          </div>
        `;
      } else {
        const isBinanceOrder = (data.payment_method === 'BINANCE_PAY' || (data.payment_channel && data.payment_channel.toUpperCase().includes('BINANCE')));
        const isBEP20Order = (data.payment_gateway === 'USDT_BEP20' || data.payment_channel === 'BEP20' || (data.payment_method === 'CRYPTO' && !isBinanceOrder));

        let payPromptText;
        if (isBEP20Order) {
          payPromptText = isEn ? 'Click here to complete payment via USDT (BEP-20) now ➔' : 'Klik di sini untuk bayar via USDT (BEP-20) sekarang ➔';
        } else if (isBinanceOrder) {
          payPromptText = isEn ? 'Click here to pay via Binance Pay (USDT) now ➔' : 'Klik di sini untuk bayar via Binance Pay (USDT) sekarang ➔';
        } else {
          payPromptText = isEn ? 'Click here to complete payment via QRIS now ➔' : 'Klik di sini untuk bayar QRIS sekarang ➔';
        }

        itemsContainer.innerHTML = `
          <div style="background: rgba(255,255,255,0.04); padding: 12px; border-radius: 8px; color: var(--text-muted); font-size: 0.85rem;">
            ${isEn ? 'This order has not been paid yet.' : 'Pesanan ini belum dibayar.'} <a href="${paymentPath}?inv=${encodeURIComponent(data.invoice_number)}" style="color: var(--primary); font-weight: 700;">${payPromptText}</a>
          </div>
        `;
      }
    } else {
      itemsContainer.innerHTML = items.map(item => `
        <div class="license-item-box">
          <span>${escapeHtml(item)}</span>
          <button class="copy-mini-btn" onclick="copyText('${escapeHtml(item)}')">${isEn ? 'Copy' : 'Salin'}</button>
        </div>
      `).join('');
    }
  }

  const warrantyTextEl = document.getElementById('resWarrantyText');
  if (warrantyTextEl) {
    warrantyTextEl.textContent = data.warranty_info || 'Garansi toko resmi aktif.';
  }

  const createdAtEl = document.getElementById('resCreatedAt');
  if (createdAtEl) {
    createdAtEl.textContent = data.created_at || '-';
  }

  // Safe fallback if legacy element exists
  const viewUrlWrap = document.getElementById('resViewUrlWrap');
  if (viewUrlWrap) {
    if (data.digitalcore_view_url) {
      viewUrlWrap.style.display = 'inline';
      const viewUrl = document.getElementById('resViewUrl');
      if (viewUrl) viewUrl.href = data.digitalcore_view_url;
    } else {
      viewUrlWrap.style.display = 'none';
    }
  }

  // Setup review submission card
  setupClaimReviewUI(data);
}

let selectedStarRating = 5;

const starLabels = {
  1: '1.0 - Kurang Puas',
  2: '2.0 - Cukup',
  3: '3.0 - Baik',
  4: '4.0 - Puas',
  5: '5.0 - Sangat Puas'
};

function setupClaimReviewUI(order) {
  const isEn = (document.documentElement && document.documentElement.lang === 'en') || (window.location.pathname.startsWith('/en'));
  const card = document.getElementById('claimReviewCard');
  if (!card) return;

  if (order.payment_status !== 'PAID') {
    card.style.display = 'none';
    return;
  }

  // Check if locally marked as reviewed
  const storageKey = `reviewed_${order.invoice_number}`;
  if (localStorage.getItem(storageKey) === 'true') {
    card.style.display = 'block';
    const form = document.getElementById('claimReviewForm');
    const succMsg = document.getElementById('claimReviewSuccessMsg');
    if (form) form.style.display = 'none';
    if (succMsg) succMsg.style.display = 'block';
    return;
  }

  card.style.display = 'block';
  const form = document.getElementById('claimReviewForm');
  const succMsg = document.getElementById('claimReviewSuccessMsg');
  if (form) form.style.display = 'block';
  if (succMsg) succMsg.style.display = 'none';

  selectedStarRating = 5;
  updateStarPickerDisplay(5);

  const starBtns = document.querySelectorAll('#starPicker .star-btn');
  starBtns.forEach(btn => {
    btn.onclick = () => {
      const r = parseInt(btn.dataset.rating, 10);
      selectedStarRating = r;
      updateStarPickerDisplay(r);
    };
    btn.onmouseenter = () => {
      const r = parseInt(btn.dataset.rating, 10);
      previewStarPickerDisplay(r);
    };
  });

  const pickerEl = document.getElementById('starPicker');
  if (pickerEl) {
    pickerEl.onmouseleave = () => {
      updateStarPickerDisplay(selectedStarRating);
    };
  }

  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btnSubmitReview');
      btn.disabled = true;
      btn.textContent = isEn ? 'Submitting...' : 'Mengirimkan...';

      const authorName = (document.getElementById('reviewAuthorInput')?.value || '').trim();
      const reviewText = (document.getElementById('reviewTextInput')?.value || '').trim();

      try {
        const url = window.digimestApi ? window.digimestApi('/api/reviews') : '/api/reviews';
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invoice_number: order.invoice_number,
            claim_code: order.claim_code,
            rating: selectedStarRating,
            author_name: authorName,
            review_text: reviewText
          })
        });

        const json = await res.json();
        if (res.ok && json.success) {
          localStorage.setItem(storageKey, 'true');
          showToast(isEn ? 'Your review has been submitted! ⭐' : 'Ulasan Anda berhasil dikirim! ⭐');
          form.style.display = 'none';
          if (succMsg) succMsg.style.display = 'block';
        } else {
          showToast(json.error || (isEn ? 'Failed to submit review' : 'Gagal mengirimkan ulasan'));
        }
      } catch (err) {
        showToast((isEn ? 'Connection error: ' : 'Koneksi gagal: ') + err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = isEn ? '⭐ Submit Review' : '⭐ Kirim Ulasan';
      }
    };
  }
}

function updateStarPickerDisplay(rating) {
  const btns = document.querySelectorAll('#starPicker .star-btn');
  btns.forEach(btn => {
    const val = parseInt(btn.dataset.rating, 10);
    btn.classList.toggle('active', val <= rating);
    btn.classList.remove('hovered');
  });
  const label = document.getElementById('starPickerLabel');
  if (label) label.textContent = starLabels[rating] || `${rating}.0`;
}

function previewStarPickerDisplay(rating) {
  const btns = document.querySelectorAll('#starPicker .star-btn');
  btns.forEach(btn => {
    const val = parseInt(btn.dataset.rating, 10);
    btn.classList.toggle('hovered', val <= rating);
  });
  const label = document.getElementById('starPickerLabel');
  if (label) label.textContent = starLabels[rating] || `${rating}.0`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag] || tag));
}

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const codeParam = params.get('code') || params.get('invoice');

  if (codeParam) {
    const inputEl = document.getElementById('claimInput');
    if (inputEl) inputEl.value = codeParam;
    doClaim(codeParam);
  }

  document.getElementById('claimForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = (document.getElementById('claimInput')?.value || '').trim();
    if (q) doClaim(q);
  });

  // History modal handlers
  document.getElementById('btnOpenHistory')?.addEventListener('click', () => {
    if (window.DigimestOrders && typeof window.DigimestOrders.openModal === 'function') {
      window.DigimestOrders.openModal('historyListContainer', 'historyModal');
    } else {
      const handler = window.DigimestOrders || window.StoreKuOrders;
      if (handler) handler.renderHistoryList('historyListContainer');
      document.getElementById('historyModal')?.classList.add('open');
    }
  });
  document.getElementById('closeHistoryBtn')?.addEventListener('click', () => {
    if (window.DigimestOrders && typeof window.DigimestOrders.closeModal === 'function') {
      window.DigimestOrders.closeModal('historyModal');
    } else {
      document.getElementById('historyModal')?.classList.remove('open');
    }
  });
  document.getElementById('historyModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'historyModal') {
      if (window.DigimestOrders && typeof window.DigimestOrders.closeModal === 'function') {
        window.DigimestOrders.closeModal('historyModal');
      } else {
        document.getElementById('historyModal')?.classList.remove('open');
      }
    }
  });
});
