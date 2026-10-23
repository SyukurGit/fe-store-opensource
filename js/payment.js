// Digimest Payment Page Engine

let pollInterval = null;
let timerInterval = null;
let currentInvoice = '';
let currentClaimCode = '';
let deliveredKeys = [];
let currentOrderData = null;
let isTerminal = false;
let isPolling = false;
let statusErrorCount = 0;
let lastSyncedSignature = '';
let manualCheckTimer = null;

function formatIDR(num) {
  if (window.DigimestCurrency && typeof window.DigimestCurrency.format === 'function') {
    return window.DigimestCurrency.format(num);
  }
  return 'Rp ' + Number(num || 0).toLocaleString('id-ID');
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

function copyText(text) {
  if (window.DigimestUtils && typeof window.DigimestUtils.copyText === 'function') {
    window.DigimestUtils.copyText(text);
    return;
  }
  const isEn = document.documentElement.lang === 'en';
  if (!navigator.clipboard || !navigator.clipboard.writeText) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    showToast(isEn ? 'Copied to clipboard!' : 'Berhasil disalin!');
    return;
  }
  navigator.clipboard.writeText(text).then(() => {
    showToast(isEn ? 'Copied to clipboard! 📋' : 'Berhasil disalin ke clipboard! 📋');
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast(isEn ? 'Copied to clipboard!' : 'Berhasil disalin!');
  });
}

function copyWithFeedback(text, btnEl) {
  if (!text) return;
  copyText(text);
  if (!btnEl) return;
  const originalHtml = btnEl.innerHTML;
  const isEn = document.documentElement.lang === 'en';
  btnEl.classList.add('copied');
  btnEl.textContent = isEn ? '✓ Copied!' : '✓ Tersalin!';
  setTimeout(() => {
    btnEl.classList.remove('copied');
    btnEl.innerHTML = originalHtml;
  }, 1500);
}

function parseTimestamp(dateStr) {
  if (!dateStr) return null;
  if (typeof dateStr === 'number') return isNaN(dateStr) ? null : dateStr;
  let clean = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(clean)) {
    clean = clean.replace(' ', 'T') + 'Z';
  } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(clean)) {
    clean = clean + 'Z';
  }
  const t = new Date(clean).getTime();
  return isNaN(t) ? null : t;
}

function getOrderHandler() {
  return window.DigimestOrders || window.DigihubOrders || window.StoreKuOrders;
}

async function loadPaymentDetails() {
  const params = new URLSearchParams(window.location.search);
  currentInvoice = params.get('inv') || params.get('invoice');

  const isEn = (document.documentElement && document.documentElement.lang === 'en') || window.location.pathname.startsWith('/en');
  if (!currentInvoice) {
    if (typeof showToast === 'function') {
      showToast(isEn ? 'Invoice number not found. Redirecting...' : 'Nomor invoice tidak ditemukan. Mengalihkan...');
    }
    setTimeout(() => {
      window.location.href = isEn ? '/en/' : '/';
    }, 1000);
    return;
  }

  document.getElementById('invDisplay').textContent = currentInvoice;

  await checkStatus();

  // Start status polling every 3 seconds, but never for a final state
  if (!isTerminal && !pollInterval) {
    pollInterval = setInterval(checkStatus, 3000);
  }
}

function stopPolling() {
  clearInterval(pollInterval);
  clearInterval(timerInterval);
  pollInterval = null;
  timerInterval = null;
}

function updatePollStatusText() {
  const el = document.getElementById('pollStatusText');
  if (!el) return;
  const isEn = document.documentElement.lang === 'en';
  const time = new Date().toLocaleTimeString(isEn ? 'en-GB' : 'id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  el.textContent = isEn ? `Auto-checked · ${time}` : `Dicek otomatis · ${time}`;
}

function showStatusErrorView() {
  const isEn = document.documentElement.lang === 'en';
  const view = document.getElementById('errorView');
  const msg = document.getElementById('errorViewMessage');
  if (msg) {
    msg.textContent = isEn
      ? 'We could not reach the payment server. Your order is safe — check your connection and try again.'
      : 'Kami tidak dapat menghubungi server pembayaran. Pesanan Anda aman — periksa koneksi lalu coba lagi.';
  }
  if (view) view.style.display = 'flex';
  const poll = document.getElementById('pollStatusText');
  if (poll) poll.textContent = isEn ? 'Automatic checks paused' : 'Pemeriksaan otomatis berhenti';
}

function hideStatusErrorView() {
  const view = document.getElementById('errorView');
  if (view) view.style.display = 'none';
}

async function retryStatusCheck() {
  statusErrorCount = 0;
  isTerminal = false;
  hideStatusErrorView();
  await checkStatus();
  if (!isTerminal && !pollInterval) {
    pollInterval = setInterval(checkStatus, 3000);
  }
}

async function checkStatus() {
  if (!currentInvoice || isTerminal || isPolling) return;
  isPolling = true;

  try {
    const statusUrl = window.digimestApi ? window.digimestApi(`/api/orders/${encodeURIComponent(currentInvoice)}/status`) : `/api/orders/${encodeURIComponent(currentInvoice)}/status`;
    const res = await fetch(statusUrl, { cache: 'no-store' });
    if (!res.ok) throw new Error('Status request failed: HTTP ' + res.status);

    const json = await res.json();
    if (!json.success || !json.data) throw new Error('Status response invalid');

    const order = json.data;
    statusErrorCount = 0;
    hideStatusErrorView();
    updatePollStatusText();

    currentClaimCode = order.claim_code || '';

    // Update status badge di header
    const statusBadge = document.getElementById('statusBadgeDisplay');
    const isEn = document.documentElement.lang === 'en';
    if (statusBadge) {
      if (order.payment_status === 'PAID') {
        statusBadge.innerHTML = isEn ? '● Paid' : '● Lunas';
        statusBadge.style.background = 'rgba(16, 185, 129, 0.15)';
        statusBadge.style.color = '#34d399';
        statusBadge.style.borderColor = 'rgba(16, 185, 129, 0.35)';
      } else if (order.payment_status === 'EXPIRED') {
        statusBadge.innerHTML = isEn ? '⌛ Expired' : '⌛ Kedaluwarsa';
        statusBadge.style.background = 'rgba(239, 68, 68, 0.15)';
        statusBadge.style.color = '#f87171';
        statusBadge.style.borderColor = 'rgba(239, 68, 68, 0.35)';
      } else if (order.payment_status === 'CANCELLED') {
        statusBadge.innerHTML = isEn ? '✕ Cancelled' : '✕ Dibatalkan';
        statusBadge.style.background = 'rgba(148, 163, 184, 0.15)';
        statusBadge.style.color = '#94a3b8';
        statusBadge.style.borderColor = 'rgba(148, 163, 184, 0.35)';
      } else {
        statusBadge.innerHTML = isEn ? '⏳ Awaiting Payment' : '⏳ Menunggu Pembayaran';
        statusBadge.style.background = 'rgba(245, 158, 11, 0.15)';
        statusBadge.style.color = '#fbbf24';
        statusBadge.style.borderColor = 'rgba(245, 158, 11, 0.35)';
      }
    }

    // Sync order state into browser's Pesanan Saya only when the snapshot changed
    const handler = getOrderHandler();
    if (handler) {
      const signature = [
        order.invoice_number,
        order.payment_status,
        order.claim_code || '',
        order.fulfillment_status || '',
        (order.delivered_items || []).length
      ].join('|');

      if (signature !== lastSyncedSignature) {
        lastSyncedSignature = signature;
        handler.saveOrder({
          invoice_number: order.invoice_number,
          claim_code: order.claim_code || '',
          product_name: order.product_name,
          quantity: order.quantity,
          total_amount: order.total_amount,
          payment_gateway: order.payment_gateway || '',
          payment_method: order.payment_method || '',
          payment_channel: order.payment_channel || '',
          crypto_amount_str: order.crypto_amount_str || '',
          crypto_currency: order.crypto_currency || '',
          customer_email: order.customer_email || '',
          fulfillment_status: order.fulfillment_status || '',
          payment_status: order.payment_status,
          expires_at: order.expires_at,
          created_at: order.created_at
        });
      }
    }

    if (order.customer_email) {
      const emailNotice = document.getElementById('emailNotice');
      const emailDisplay = document.getElementById('buyerEmailDisplay');
      if (emailNotice && emailDisplay) {
        emailDisplay.textContent = order.customer_email;
        emailNotice.style.display = 'block';
      }
    }

    // Check if Paid and Fulfilled
    if (order.payment_status === 'PAID') {
      isTerminal = true;
      stopPolling();
      if (handler) handler.updateOrderStatus(order.invoice_number, 'PAID');
      showSuccessView(order);
      return;
    }

    if (order.payment_status === 'EXPIRED') {
      isTerminal = true;
      stopPolling();
      if (handler) handler.updateOrderStatus(order.invoice_number, 'EXPIRED');
      showExpiredView();
      return;
    }

    if (order.payment_status === 'CANCELLED') {
      isTerminal = true;
      stopPolling();
      if (handler) handler.updateOrderStatus(order.invoice_number, 'CANCELLED');
      showCancelledView();
      return;
    }

    // Render Pending View
    renderPendingView(order);

  } catch (err) {
    console.warn('Poll error:', err);
    statusErrorCount++;
    if (statusErrorCount >= 2 && !isTerminal) {
      clearInterval(pollInterval);
      pollInterval = null;
      showStatusErrorView();
    }
  } finally {
    isPolling = false;
  }
}

function renderPendingView(order) {
  currentOrderData = order;
  const isBinance = (order.payment_method === 'BINANCE_PAY' || order.payment_gateway === 'BINANCE');
  const isBEP20 = (order.payment_gateway === 'USDT_BEP20' || order.payment_channel === 'BEP20' || order.payment_gateway === 'PAYMENTG_BEP20' || (order.payment_method === 'CRYPTO' && !isBinance));
  
  const qrisBox = document.getElementById('qrisPendingContainer');
  const binanceBox = document.getElementById('binancePendingContainer');
  const bep20Box = document.getElementById('bep20PendingContainer');

  const qrisVisual = document.getElementById('qrisVisualBox');
  const binanceVisual = document.getElementById('binanceVisualBox');
  const bep20Visual = document.getElementById('bep20VisualBox');

  // Populate product info snippet
  const prodNameEl = document.getElementById('pendingProductName');
  if (prodNameEl && order.product_name) {
    prodNameEl.textContent = order.product_name;
  }
  const prodQtyEl = document.getElementById('pendingProductQty');
  if (prodQtyEl && order.quantity) {
    prodQtyEl.textContent = `${order.quantity}x`;
  }

  if (isBEP20) {
    if (qrisBox) qrisBox.style.display = 'none';
    if (binanceBox) binanceBox.style.display = 'none';
    if (bep20Box) bep20Box.style.display = 'flex';

    if (qrisVisual) qrisVisual.style.display = 'none';
    if (binanceVisual) binanceVisual.style.display = 'none';
    if (bep20Visual) bep20Visual.style.display = 'flex';

    if (order.qr_url) {
      const qrImg = document.getElementById('bep20QrCode');
      const safeQr = window.DigimestUtils?.safeUrl ? window.DigimestUtils.safeUrl(order.qr_url) : order.qr_url;
      if (qrImg && safeQr && qrImg.src !== safeQr) {
        qrImg.src = safeQr;
      }
    }

    const bepAmount = document.getElementById('bep20AmountDisplay');
    if (bepAmount && order.crypto_amount_str) {
      bepAmount.textContent = order.crypto_amount_str;
    }
    const bepCexAmount = document.getElementById('bep20CexAmount');
    if (bepCexAmount && order.crypto_amount_str) {
      bepCexAmount.textContent = order.crypto_amount_str;
    }
    const bepWallet = document.getElementById('bep20WalletDisplay');
    if (bepWallet && order.wallet_address) {
      bepWallet.textContent = order.wallet_address;
    }
  } else if (isBinance) {
    if (qrisBox) qrisBox.style.display = 'none';
    if (bep20Box) bep20Box.style.display = 'none';
    if (binanceBox) binanceBox.style.display = 'flex';

    if (qrisVisual) qrisVisual.style.display = 'none';
    if (bep20Visual) bep20Visual.style.display = 'none';
    if (binanceVisual) binanceVisual.style.display = 'flex';

    if (order.qr_url) {
      const qrImg = document.getElementById('binanceQrCode');
      const safeQr = window.DigimestUtils?.safeUrl ? window.DigimestUtils.safeUrl(order.qr_url) : order.qr_url;
      if (qrImg && safeQr && qrImg.src !== safeQr) {
        qrImg.src = safeQr;
      }
    }

    const cryptoAmt = document.getElementById('cryptoAmountDisplay');
    if (cryptoAmt && order.crypto_amount_str) {
      cryptoAmt.textContent = order.crypto_amount_str;
    }
    const cryptoCurr = document.getElementById('cryptoCurrencyDisplay');
    if (cryptoCurr && order.crypto_currency) {
      cryptoCurr.textContent = order.crypto_currency;
    }
    const payId = document.getElementById('binancePayIdDisplay');
    if (payId && order.binance_pay_id) {
      payId.textContent = order.binance_pay_id;
    }
    const accName = document.getElementById('binanceAccountNameDisplay');
    if (accName && order.binance_account_name) {
      accName.textContent = order.binance_account_name;
    }
  } else {
    if (binanceBox) binanceBox.style.display = 'none';
    if (bep20Box) bep20Box.style.display = 'none';
    if (qrisBox) qrisBox.style.display = 'flex';

    if (binanceVisual) binanceVisual.style.display = 'none';
    if (bep20Visual) bep20Visual.style.display = 'none';
    if (qrisVisual) qrisVisual.style.display = 'flex';

    const amtText = document.getElementById('totalAmountText');
    if (amtText) {
      const cur = window.DigimestCurrency ? window.DigimestCurrency.getCurrency() : 'IDR';
      const idrFormatted = 'Rp ' + Number(order.total_amount || 0).toLocaleString('id-ID');
      if (cur === 'USD' && window.DigimestCurrency) {
        const rate = window.DigimestCurrency.getRate();
        const usdVal = (Number(order.total_amount || 0) / rate).toFixed(2);
        amtText.textContent = `${idrFormatted} (~$${usdVal})`;
      } else {
        amtText.textContent = idrFormatted;
      }
    }

    if (order.qr_url) {
      const qrisImg = document.getElementById('qrisImage');
      const safeQr = window.DigimestUtils?.safeUrl ? window.DigimestUtils.safeUrl(order.qr_url) : order.qr_url;
      if (qrisImg && safeQr && qrisImg.src !== safeQr) {
        qrisImg.src = safeQr;
      }
    }
  }

  // Setup countdown timer
  if (!timerInterval) {
    let targetTime = parseTimestamp(order.expires_at);
    if (!targetTime && order.created_at) {
      const createdTime = parseTimestamp(order.created_at);
      if (createdTime) targetTime = createdTime + 15 * 60 * 1000;
    }
    if (!targetTime) {
      targetTime = Date.now() + 15 * 60 * 1000;
    }
    startCountdown(targetTime);
  }
}

function startCountdown(targetTime) {
  const timerText = document.getElementById('timerText');

  function update() {
    const now = new Date().getTime();
    const distance = targetTime - now;

    if (distance <= 0) {
      isTerminal = true;
      stopPolling();
      const handler = getOrderHandler();
      if (handler) handler.updateOrderStatus(currentInvoice, 'EXPIRED');
      showExpiredView();
      return;
    }

    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    timerText.textContent = `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }

  update();
  if (!isTerminal) {
    timerInterval = setInterval(update, 1000);
  }
}

function showSuccessView(order) {
  isTerminal = true;
  stopPolling();
  document.getElementById('pendingView').style.display = 'none';
  document.getElementById('expiredView').style.display = 'none';
  const cancelledView = document.getElementById('cancelledView');
  if (cancelledView) cancelledView.style.display = 'none';
  const successView = document.getElementById('successView');
  successView.style.display = 'block';
  const timerBox = document.querySelector('.timer-box-inline');
  if (timerBox) timerBox.style.display = 'none';

  const isEn = document.documentElement.lang === 'en';
  document.getElementById('sProdName').textContent = order.product_name;
  document.getElementById('sProdWarranty').textContent = order.warranty_info ? `🛡️ ${order.warranty_info}` : (isEn ? '🛡️ Store Warranty' : '🛡️ Garansi Toko');

  currentClaimCode = order.claim_code || '';

  // Setup KARTU KODE AMBIL PESANAN & DIRECT LINK
  const paidCodeEl = document.getElementById('paidClaimCodeDisplay');
  if (paidCodeEl) {
    paidCodeEl.textContent = currentClaimCode || '-';
  }

  const directLinkEl = document.getElementById('paidDirectClaimLink');
  if (currentClaimCode) {
    const claimPath = isEn ? '/en/claim' : '/claim';
    const directUrl = `${window.location.origin}${claimPath}?code=${encodeURIComponent(currentClaimCode)}`;
    if (directLinkEl) {
      directLinkEl.href = directUrl;
    }
  }

  const copyClaimBtn = document.getElementById('btnCopyClaimCode');
  if (copyClaimBtn && currentClaimCode) {
    copyClaimBtn.onclick = (e) => {
      copyWithFeedback(currentClaimCode, e.currentTarget);
    };
  }

  if (order.customer_email) {
    const emailNotice = document.getElementById('emailNotice');
    if (emailNotice) {
      emailNotice.style.background = 'rgba(16, 185, 129, 0.12)';
      emailNotice.style.borderColor = 'rgba(16, 185, 129, 0.35)';
      emailNotice.style.color = '#34d399';
      emailNotice.innerHTML = isEn 
        ? `✉️ Order pickup code & details have been sent to email: <strong style="color:var(--text-main);">${escapeHtml(order.customer_email)}</strong>`
        : `✉️ Kode ambil pesanan & rincian telah dikirim ke email: <strong style="color:var(--text-main);">${escapeHtml(order.customer_email)}</strong>`;
      emailNotice.style.display = 'block';
    }
  }

  deliveredKeys = order.delivered_items || [];
  const itemsContainer = document.getElementById('itemsContainer');
  const copyAllBtn = document.getElementById('copyAllKeysBtn');

  if (order.is_quota_out || order.fulfillment_status === 'HOLD_PRICE_SPIKE' || order.fulfillment_status === 'HOLD_INSUFFICIENT_BOT_BALANCE' || order.fulfillment_status === 'FAILED') {
    if (copyAllBtn) copyAllBtn.style.display = 'none';
    const isFailed = order.fulfillment_status === 'FAILED' || order.fulfillment_status === 'HOLD_INSUFFICIENT_BOT_BALANCE';
    const title = isEn 
      ? (isFailed ? 'Payment Verified — Preparing License Allocation' : 'Payment Verified — Waiting for Stock')
      : (isFailed ? 'Pembayaran Sukses — Lisensi Sedang Disiapkan Admin' : 'Pembayaran Sukses — Menunggu Alokasi Stok');
    const defaultMsg = isEn
      ? "Your payment was successfully received. The license for this order is currently being assigned by our admin team on priority queue (usually 5–15 mins). Your funds are 100% safe and protected! Click below to confirm directly with our Customer Support."
      : "Pembayaran Anda telah sukses kami terima. Lisensi pesanan ini sedang disiapkan dan dialokasikan oleh tim admin dalam antrean prioritas (biasanya 5–15 menit). Dana Anda 100% aman dan terjamin! Klik tombol di bawah untuk konfirmasi langsung ke Customer Service kami.";

    const supportMessage = isEn
      ? `Hello Admin Digimest, I have completed payment for invoice ${currentInvoice} (${order.product_name || 'Product'}). Please assist with my license delivery.`
      : `Halo Admin Digimest, saya sudah bayar Invoice ${currentInvoice} (${order.product_name || 'Produk'}). Mohon bantuan penerbitan lisensinya.`;

    itemsContainer.innerHTML = `
      <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; padding: 18px; text-align: center;">
        <div style="display: inline-flex; align-items: center; gap: 6px; font-size: 0.76rem; font-weight: 800; color: #34d399; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.35); padding: 3px 10px; border-radius: 999px; margin-bottom: 10px;">
          <span>🛡️</span> ${isEn ? 'FUNDS 100% SAFE • SYSTEM PRIORITY' : 'DANA 100% AMAN • PRIORITAS SISTEM'}
        </div>
        <div style="font-weight: 700; color: #fbbf24; font-size: 1.05rem; margin-bottom: 8px;">${title}</div>
        <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.55; margin-bottom: 14px;">
          ${escapeHtml(order.quota_out_message || defaultMsg)}
        </p>
        <a href="#" target="_blank" rel="noopener" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-size: 0.88rem; font-weight: 700; color: #ffffff !important; background: linear-gradient(135deg, #25d366, #128c7e); border: none; border-radius: 8px; padding: 10px 20px; text-decoration: none; box-shadow: 0 4px 14px rgba(37, 211, 102, 0.32);" data-tele-cs data-support-message="${escapeHtml(supportMessage)}">
          <span>💬 ${isEn ? 'Chat WhatsApp Support' : 'Hubungi Admin via WhatsApp'}</span> ➔
        </a>
      </div>
    `;
    showToast(isEn ? 'Payment Verified — Processing License' : 'Pembayaran Sukses — Lisensi Sedang Diproses');
    return;
  }

  if (deliveredKeys.length === 0) {
    itemsContainer.innerHTML = `
      <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: 10px; padding: 12px; color: #fbbf24; font-size: 0.85rem; line-height: 1.45;">
        ${isEn
          ? 'Payment verified! Your license is being generated by the system queue in 1–2 minutes. Please wait a moment or keep your Pickup Code saved.'
          : 'Pembayaran sukses terverifikasi! Lisensi Anda sedang digenerate oleh antrean sistem dalam 1–2 menit. Mohon tunggu sebentar atau simpan Kode Pengambilan di samping.'}
      </div>
    `;
  } else {
    if (copyAllBtn) copyAllBtn.style.display = 'inline-block';
    itemsContainer.innerHTML = deliveredKeys.map(item => `
      <div class="license-item-box">
        <span>${escapeHtml(item)}</span>
        <button type="button" class="copy-mini-btn" data-copy="${escapeHtml(item)}">${isEn ? 'Copy' : 'Salin'}</button>
      </div>
    `).join('');
  }

  const existingTx = document.getElementById('successTxHashRow');
  if (existingTx) existingTx.remove();

  const isBinanceOrder = (order.payment_method === 'BINANCE_PAY' || order.payment_gateway === 'BINANCE');
  const isBEP20Order = (order.payment_gateway === 'USDT_BEP20' || order.payment_channel === 'BEP20' || order.payment_gateway === 'PAYMENTG_BEP20' || order.payment_method === 'USDT' || (order.payment_method === 'CRYPTO' && !isBinanceOrder));

  // ONLY render blockchain tx hash for genuine BSC on-chain transactions (BEP-20)
  if (isBEP20Order && order.tx_hash && typeof order.tx_hash === 'string' && order.tx_hash.toLowerCase().startsWith('0x') && order.tx_hash.length >= 60) {
    const txRow = document.createElement('div');
    txRow.id = 'successTxHashRow';
    txRow.style.cssText = 'background: rgba(240, 185, 11, 0.08); border: 1px solid rgba(240, 185, 11, 0.25); border-radius: 10px; padding: 10px 14px; margin-top: 1rem; font-size: 0.8rem; display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; text-align: left;';
    txRow.innerHTML = `
      <div style="display: flex; align-items: center; gap: 6px;">
        <span>🟡</span>
        <span style="color: #94a3b8;">${isEn ? 'Blockchain Tx Hash (BSC):' : 'Hash Transaksi Blockchain (BSC):'}</span>
      </div>
      <a href="https://bscscan.com/tx/${encodeURIComponent(order.tx_hash)}" target="_blank" rel="noopener noreferrer" style="color: #f0b90b; font-family: var(--font-mono); font-weight: 700; text-decoration: underline; font-size: 0.78rem;" title="${escapeHtml(order.tx_hash)}">
        ${escapeHtml(order.tx_hash.slice(0, 10))}...${escapeHtml(order.tx_hash.slice(-8))} ↗
      </a>
    `;
    itemsContainer.parentNode.appendChild(txRow);
  } else if (isBinanceOrder && order.binance_tx_id && order.binance_tx_id !== 'MANUAL_ADMIN_CONFIRMATION' && !order.binance_tx_id.startsWith('sbx_')) {
    // For Binance Pay: display internal merchant/binance transaction ID cleanly without blockchain link
    const txRow = document.createElement('div');
    txRow.id = 'successTxHashRow';
    txRow.style.cssText = 'background: rgba(240, 185, 11, 0.08); border: 1px solid rgba(240, 185, 11, 0.25); border-radius: 10px; padding: 10px 14px; margin-top: 1rem; font-size: 0.8rem; display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; text-align: left;';
    txRow.innerHTML = `
      <div style="display: flex; align-items: center; gap: 6px;">
        <span>🟡</span>
        <span style="color: #94a3b8;">${isEn ? 'Binance Order Ref:' : 'Referensi Transaksi Binance:'}</span>
      </div>
      <span style="color: #f0b90b; font-family: var(--font-mono); font-weight: 700; font-size: 0.78rem;">
        ${escapeHtml(order.binance_tx_id)}
      </span>
    `;
    itemsContainer.parentNode.appendChild(txRow);
  }

  showToast(isEn ? 'Payment Successful! 🎉' : 'Pembayaran Berhasil! 🎉');
}


function showExpiredView() {
  isTerminal = true;
  stopPolling();
  document.getElementById('pendingView').style.display = 'none';
  document.getElementById('successView').style.display = 'none';
  const cancelledView = document.getElementById('cancelledView');
  if (cancelledView) cancelledView.style.display = 'none';
  document.getElementById('expiredView').style.display = 'block';
  const timerText = document.getElementById('timerText');
  if (timerText) timerText.textContent = '00:00';
}

function showCancelledView() {
  isTerminal = true;
  stopPolling();
  document.getElementById('pendingView').style.display = 'none';
  document.getElementById('successView').style.display = 'none';
  document.getElementById('expiredView').style.display = 'none';
  const cancelledView = document.getElementById('cancelledView');
  if (cancelledView) cancelledView.style.display = 'block';
  const timerBox = document.querySelector('.timer-box-inline');
  if (timerBox) timerBox.style.display = 'none';
}

function openCancelModal() {
  document.getElementById('cancelConfirmModal')?.classList.add('open');
}

function closeCancelModal() {
  document.getElementById('cancelConfirmModal')?.classList.remove('open');
}

async function confirmCancelOrder() {
  const isEn = document.documentElement.lang === 'en';
  const btn = document.getElementById('btnConfirmCancelAction');
  if (btn) {
    btn.disabled = true;
    btn.textContent = isEn ? 'Cancelling...' : 'Membatalkan...';
  }

  try {
    const cancelUrl = window.digimestApi ? window.digimestApi(`/api/orders/${encodeURIComponent(currentInvoice)}/cancel`) : `/api/orders/${encodeURIComponent(currentInvoice)}/cancel`;
    const res = await fetch(cancelUrl, {
      method: 'POST'
    });
    const json = await res.json();

    if (!json.success) {
      showToast(json.error || (isEn ? 'Failed to cancel order.' : 'Gagal membatalkan pesanan.'));
      if (btn) {
        btn.disabled = false;
        btn.textContent = isEn ? 'Yes, Cancel' : 'Ya, Batalkan';
      }
      return;
    }

    closeCancelModal();
    isTerminal = true;
    stopPolling();

    const handler = getOrderHandler();
    if (handler) {
      handler.updateOrderStatus(currentInvoice, 'CANCELLED');
    }

    showCancelledView();
    showToast(isEn ? 'Order cancelled successfully. ✕' : 'Pesanan berhasil dibatalkan. ✕');
  } catch (err) {
    showToast((isEn ? 'Connection error: ' : 'Koneksi terputus: ') + err.message);
    if (btn) {
      btn.disabled = false;
      btn.textContent = isEn ? 'Yes, Cancel' : 'Ya, Batalkan';
    }
  }
}

// "Saya Sudah Bayar" instant trigger (dynamically handles either pending or expired late button)
async function triggerManualCheck(e) {
  const isEn = document.documentElement.lang === 'en';
  const targetBtn = (e && e.currentTarget) ? e.currentTarget : document.getElementById('btnManualCheck');
  if (!currentInvoice) return;

  const spinner = document.getElementById('manualCheckSpinner');
  const icon = document.getElementById('manualCheckIcon');
  const textEl = document.getElementById('manualCheckText');

  if (spinner) spinner.style.display = 'inline-block';
  if (icon) icon.style.display = 'none';
  if (textEl) {
    textEl.textContent = isEn ? 'Checking payment mutation...' : 'Memeriksa mutasi pembayaran...';
  } else if (targetBtn) {
    targetBtn.innerText = isEn ? 'Checking payment mutation...' : 'Memeriksa mutasi pembayaran...';
  }

  if (targetBtn) {
    targetBtn.disabled = true;
  }

  try {
    const checkUrl = window.digimestApi ? window.digimestApi(`/api/orders/${encodeURIComponent(currentInvoice)}/check`) : `/api/orders/${encodeURIComponent(currentInvoice)}/check`;
    const res = await fetch(checkUrl, {
      method: 'POST'
    });
    const json = await res.json();
    if (json.success && json.data) {
      if (json.data.payment_status === 'PAID') {
        const handler = getOrderHandler();
        if (handler) handler.updateOrderStatus(currentInvoice, 'PAID');
        showSuccessView(json.data);
        return;
      }
    }
    // Perform full status poll update
    await checkStatus();
    showToast(json.message || (isEn ? 'Payment not detected yet. Please wait 10-30 seconds.' : 'Mutasi belum terdeteksi. Silakan tunggu 10-30 detik.'));
  } catch (err) {
    showToast((isEn ? 'Failed to check payment: ' : 'Gagal memeriksa mutasi: ') + err.message);
  } finally {
    // Cooldown 4 seconds to match server throttle
    clearTimeout(manualCheckTimer);
    manualCheckTimer = setTimeout(() => {
      if (spinner) spinner.style.display = 'none';
      if (icon) icon.style.display = 'inline-block';
      if (textEl) {
        textEl.textContent = isEn ? 'I Have Paid (Check Status Now)' : 'Saya Sudah Bayar (Cek Mutasi Sekarang)';
      } else if (targetBtn) {
        targetBtn.innerText = isEn ? '⚡ Check Status' : '⚡ Periksa Status';
      }
      if (targetBtn) {
        targetBtn.disabled = false;
      }
    }, 4000);
  }
}

function downloadQrisImage() {
  const qrisImg = document.getElementById('qrisImage');
  const isEn = document.documentElement.lang === 'en';
  if (!qrisImg || !qrisImg.src) {
    showToast(isEn ? 'QR image not ready yet' : 'Gambar QR belum siap diunduh');
    return;
  }

  fetch(qrisImg.src, { mode: 'cors' })
    .then(res => {
      if (!res.ok) throw new Error('Network error: ' + res.status);
      return res.blob();
    })
    .then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QRIS-${currentInvoice || 'Digimest'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(isEn ? 'QRIS image downloaded! 📥' : 'Gambar QRIS berhasil diunduh! 📥');
    })
    .catch(() => {
      // Fallback via in-memory canvas
      try {
        const canvas = document.createElement('canvas');
        canvas.width = qrisImg.naturalWidth || 250;
        canvas.height = qrisImg.naturalHeight || 250;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(qrisImg, 0, 0);
        canvas.toBlob(blob => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `QRIS-${currentInvoice || 'Digimest'}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast(isEn ? 'QRIS image downloaded! 📥' : 'Gambar QRIS berhasil diunduh! 📥');
          } else {
            window.open(qrisImg.src, '_blank');
          }
        });
      } catch (e) {
        window.open(qrisImg.src, '_blank');
      }
    });
}

function copyAllKeys() {
  if (deliveredKeys.length === 0) return;
  copyText(deliveredKeys.join('\n'));
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag] || tag));
}

document.addEventListener('DOMContentLoaded', () => {
  loadPaymentDetails();

  document.getElementById('btnManualCheck')?.addEventListener('click', triggerManualCheck);
  document.getElementById('btnCheckExpiredLate')?.addEventListener('click', triggerManualCheck);
  document.getElementById('copyAllKeysBtn')?.addEventListener('click', copyAllKeys);
  document.getElementById('btnDownloadQris')?.addEventListener('click', downloadQrisImage);

  // Copy button for QRIS
  document.getElementById('btnCopyQrisAmount')?.addEventListener('click', (e) => {
    const el = document.getElementById('totalAmountText');
    if (el) {
      const rawText = el.textContent.trim();
      const match = rawText.match(/Rp\s*([\d\.,]+)/i);
      const cleanVal = match ? match[1].replace(/\./g, '') : rawText.replace(/[^\d]/g, '');
      copyWithFeedback(cleanVal || rawText, e.currentTarget);
    }
  });

  // Copy buttons for Binance Pay
  document.getElementById('btnCopyCryptoAmount')?.addEventListener('click', (e) => {
    const el = document.getElementById('cryptoAmountDisplay');
    if (el) copyWithFeedback(el.textContent.trim(), e.currentTarget);
  });
  document.getElementById('btnCopyPayId')?.addEventListener('click', (e) => {
    const el = document.getElementById('binancePayIdDisplay');
    if (el) copyWithFeedback(el.textContent.trim(), e.currentTarget);
  });

  // Copy buttons for USDT BEP-20
  document.getElementById('btnCopyBep20Amount')?.addEventListener('click', (e) => {
    const el = document.getElementById('bep20AmountDisplay');
    if (el) copyWithFeedback(el.textContent.trim(), e.currentTarget);
  });
  document.getElementById('btnCopyBep20Wallet')?.addEventListener('click', (e) => {
    const el = document.getElementById('bep20WalletDisplay');
    if (el) copyWithFeedback(el.textContent.trim(), e.currentTarget);
  });

  // Cancel order modal handlers
  document.getElementById('btnCancelOrder')?.addEventListener('click', openCancelModal);
  document.getElementById('btnDismissCancelModal')?.addEventListener('click', closeCancelModal);
  document.getElementById('btnConfirmCancelAction')?.addEventListener('click', confirmCancelOrder);
  document.getElementById('cancelConfirmModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'cancelConfirmModal') closeCancelModal();
  });

  // Pause polling when tab is hidden, resume when tab is active
  document.addEventListener('visibilitychange', async () => {
    if (document.hidden) {
      clearInterval(pollInterval);
      pollInterval = null;
      return;
    }
    const isPending = document.getElementById('pendingView')?.style.display !== 'none';
    if (currentInvoice && isPending && !isTerminal) {
      clearInterval(pollInterval);
      pollInterval = null;
      await checkStatus();
      if (!isTerminal && !pollInterval) {
        pollInterval = setInterval(checkStatus, 3000);
      }
    }
  });

  // Copy buttons inside the delivered-license list (data attribute, no inline JS)
  document.getElementById('itemsContainer')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.copy-mini-btn[data-copy]');
    if (!btn) return;
    copyWithFeedback(btn.getAttribute('data-copy'), btn);
  });

  document.getElementById('btnRetryStatus')?.addEventListener('click', retryStatusCheck);

  // Reactive Currency Switcher Listener for Payment Page
  window.addEventListener('currencychange', () => {
    if (currentOrderData) {
      renderPendingView(currentOrderData);
    }
  });
});
