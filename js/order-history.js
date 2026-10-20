// Digimest Unified Order History Engine
// Manages local order storage, real-time payment states, 15-min expiration audit & UI rendering

const DigimestOrders = (() => {
  const PRIMARY_STORAGE_KEY = 'digimest_orders';
  const LEGACY_STORAGE_KEYS = ['digihub_orders', 'diginest_orders', 'storeku_orders', 'storeku_history'];

  // Format currency helper
  function formatIDR(num) {
    if (window.DigimestCurrency && typeof window.DigimestCurrency.format === 'function') {
      return window.DigimestCurrency.format(num);
    }
    return 'Rp ' + Number(num || 0).toLocaleString('id-ID');
  }

  // Safe escape HTML
  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, tag => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));
  }

  // Safe timestamp parser (normalizes strings without timezone as UTC)
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

  // Check if order or expiration timestamp has elapsed
  function isExpired(target) {
    if (!target) return false;

    // If passed an order object
    if (typeof target === 'object') {
      if (target.payment_status === 'EXPIRED') return true;

      if (target.expires_at) {
        const expTime = parseTimestamp(target.expires_at);
        if (expTime) return Date.now() > expTime;
      }

      // Fallback: created_at + 15 minutes
      if (target.created_at) {
        const createTime = parseTimestamp(target.created_at);
        if (createTime) return Date.now() > (createTime + 15 * 60 * 1000);
      }

      return false;
    }

    // If passed a timestamp or date string directly
    const expTime = parseTimestamp(target);
    if (!expTime) return false;
    return Date.now() > expTime;
  }

  // Read one storage key without letting a single corrupt entry wipe everything
  function readOrdersKey(key) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('DigihubOrders: Skipping unreadable storage key:', key);
      return [];
    }
  }

  // Retrieve and auto-migrate legacy history
  function getOrders() {
    try {
      let orders = readOrdersKey(PRIMARY_STORAGE_KEY);
      
      // Auto-migrate from legacy keys if primary is empty or legacy has unmerged items
      let merged = false;
      const existingInv = new Set(orders.map(o => o.invoice_number));

      for (const legKey of LEGACY_STORAGE_KEYS) {
        const legacy = readOrdersKey(legKey);
        if (Array.isArray(legacy) && legacy.length > 0) {
          for (const item of legacy) {
            if (item && item.invoice_number && !existingInv.has(item.invoice_number)) {
              orders.push({
                ...item,
                invoice_number: item.invoice_number,
                claim_code: item.claim_code || '',
                product_name: item.product_name || 'Produk Digital',
                quantity: item.quantity || 1,
                total_amount: item.total_amount || 0,
                payment_status: item.payment_status || 'PENDING',
                expires_at: item.expires_at || null,
                created_at: item.created_at || new Date().toISOString()
              });
              existingInv.add(item.invoice_number);
              merged = true;
            }
          }
        }
      }

      if (merged) {
        localStorage.setItem(PRIMARY_STORAGE_KEY, JSON.stringify(orders));
      }

      return Array.isArray(orders) ? orders : [];
    } catch (e) {
      console.warn('DigihubOrders: Failed to read orders from localStorage:', e);
      return [];
    }
  }

  // Save or update an order in storage
  function saveOrder(orderData) {
    if (!orderData || !orderData.invoice_number) return;

    try {
      let list = getOrders();
      const existingIdx = list.findIndex(o => o.invoice_number === orderData.invoice_number);

      if (existingIdx >= 0) {
        // Merge existing fields to avoid losing claim_code or product details
        list[existingIdx] = {
          ...list[existingIdx],
          ...orderData,
          claim_code: orderData.claim_code || list[existingIdx].claim_code || '',
          payment_status: orderData.payment_status || list[existingIdx].payment_status || 'PENDING',
          expires_at: orderData.expires_at || list[existingIdx].expires_at || null
        };
      } else {
        // New order pushed to front (keep every field so crypto orders render correctly)
        list.unshift({
          ...orderData,
          invoice_number: orderData.invoice_number,
          claim_code: orderData.claim_code || '',
          product_name: orderData.product_name || 'Produk Digital',
          quantity: orderData.quantity || 1,
          total_amount: orderData.total_amount || 0,
          payment_status: orderData.payment_status || 'PENDING',
          expires_at: orderData.expires_at || null,
          created_at: orderData.created_at || new Date().toISOString()
        });
      }

      if (list.length > 50) list = list.slice(0, 50);
      localStorage.setItem(PRIMARY_STORAGE_KEY, JSON.stringify(list));
      localStorage.setItem('storeku_orders', JSON.stringify(list));
      updateBadge();
    } catch (e) {
      console.warn('DigihubOrders: Failed to save order:', e);
    }
  }

  // Update specific order status
  function updateOrderStatus(invoiceNumber, status) {
    if (!invoiceNumber) return;
    try {
      let list = getOrders();
      let changed = false;
      for (let item of list) {
        if (item.invoice_number === invoiceNumber) {
          item.payment_status = status;
          changed = true;
        }
      }
      if (changed) {
        localStorage.setItem(PRIMARY_STORAGE_KEY, JSON.stringify(list));
        localStorage.setItem('storeku_orders', JSON.stringify(list));
      }
    } catch (e) {
      console.warn('DigihubOrders: Failed to update order status:', e);
    }
  }

  // Update navbar badge count
  function updateBadge() {
    const list = getOrders();
    const badges = document.querySelectorAll('#historyBadge, .history-badge-count');
    badges.forEach(badge => {
      if (list.length > 0) {
        if (badge.classList.contains('hamburger-badge-dot')) {
          badge.style.display = 'block';
        } else {
          badge.textContent = list.length;
          badge.style.display = 'inline-block';
        }
      } else {
        badge.style.display = 'none';
      }
    });
  }

  // Remove a single order from history
  function removeOrder(invoiceNumber, containerId) {
    if (!invoiceNumber) return;
    try {
      let list = getOrders();
      list = list.filter(o => o.invoice_number !== invoiceNumber);
      localStorage.setItem(PRIMARY_STORAGE_KEY, JSON.stringify(list));
      for (const legKey of LEGACY_STORAGE_KEYS) {
        try {
          let legacy = JSON.parse(localStorage.getItem(legKey) || '[]');
          if (Array.isArray(legacy)) {
            legacy = legacy.filter(o => o.invoice_number !== invoiceNumber);
            localStorage.setItem(legKey, JSON.stringify(legacy));
          }
        } catch (e) {}
      }
      updateBadge();
      if (containerId) {
        renderHistoryList(containerId, true);
      }
    } catch (e) {
      console.warn('DigimestOrders: Failed to remove order:', e);
    }
  }

  // Clear all expired or cancelled orders from history
  function clearExpiredOrders(containerId) {
    try {
      let list = getOrders();
      list = list.filter(o => {
        if (o.payment_status === 'EXPIRED' || o.payment_status === 'CANCELLED') return false;
        if (o.payment_status === 'PENDING' && isExpired(o)) return false;
        return true;
      });
      localStorage.setItem(PRIMARY_STORAGE_KEY, JSON.stringify(list));
      for (const legKey of LEGACY_STORAGE_KEYS) {
        try {
          let legacy = JSON.parse(localStorage.getItem(legKey) || '[]');
          if (Array.isArray(legacy)) {
            legacy = legacy.filter(o => {
              if (o.payment_status === 'EXPIRED' || o.payment_status === 'CANCELLED') return false;
              if (o.payment_status === 'PENDING' && isExpired(o)) return false;
              return true;
            });
            localStorage.setItem(legKey, JSON.stringify(legacy));
          }
        } catch (e) {}
      }
      updateBadge();
      if (containerId) {
        renderHistoryList(containerId, true);
      }
    } catch (e) {
      console.warn('DigimestOrders: Failed to clear expired orders:', e);
    }
  }

  // Background sync for pending orders against backend API
  let isSyncing = false;
  let lastSyncTime = 0;

  async function syncPendingOrders(containerId) {
    const now = Date.now();
    if (isSyncing || (now - lastSyncTime < 8000)) return;
    isSyncing = true;
    lastSyncTime = now;

    try {
      let list = getOrders();
      const pendingOrders = list.filter(o => !o.payment_status || o.payment_status === 'PENDING');
      if (pendingOrders.length === 0) {
        isSyncing = false;
        return;
      }

      let changed = false;
      await Promise.all(pendingOrders.slice(0, 10).map(async (order) => {
        try {
          const inv = encodeURIComponent(order.invoice_number);
          const statusUrl = window.digimestApi ? window.digimestApi(`/api/orders/${inv}/status`) : `/api/orders/${inv}/status`;
          const res = await fetch(statusUrl);
          if (!res.ok) return;
          const json = await res.json();
          if (json.success && json.data) {
            const s = json.data.payment_status;
            if (s && s !== order.payment_status) {
              order.payment_status = s;
              changed = true;
            }
            if (json.data.claim_code && json.data.claim_code !== order.claim_code) {
              order.claim_code = json.data.claim_code;
              changed = true;
            }
            if (json.data.expires_at && json.data.expires_at !== order.expires_at) {
              order.expires_at = json.data.expires_at;
              changed = true;
            }
            // Backfill payment metadata for orders saved before the whitelist fix
            ['payment_gateway', 'payment_method', 'payment_channel', 'crypto_amount_str', 'crypto_currency'].forEach(key => {
              if (json.data[key] && !order[key]) {
                order[key] = json.data[key];
                changed = true;
              }
            });
            if (json.data.total_amount && !order.total_amount) {
              order.total_amount = json.data.total_amount;
              changed = true;
            }
          }
        } catch (err) {}
      }));

      if (changed) {
        localStorage.setItem(PRIMARY_STORAGE_KEY, JSON.stringify(list));
        localStorage.setItem('storeku_orders', JSON.stringify(list));
        updateBadge();
        if (containerId) {
          renderHistoryList(containerId, true);
        }
      }
    } catch (e) {
      console.warn('DigimestOrders: Background sync failed:', e);
    } finally {
      isSyncing = false;
    }
  }

  // Render modal list
  function renderHistoryList(containerId = 'historyListContainer', skipSync = false) {
    const targetId = containerId || 'historyListContainer';
    const container = document.getElementById(targetId);
    if (!container) return;

    const isEn = (typeof document !== 'undefined' && document.documentElement && document.documentElement.lang === 'en') ||
                 (typeof window !== 'undefined' && window.location && window.location.pathname.startsWith('/en'));

    let list = getOrders();

    // Local audit: immediately flag pending items that have expired by time
    let hasLocalChanges = false;
    for (const item of list) {
      if ((!item.payment_status || item.payment_status === 'PENDING') && isExpired(item)) {
        item.payment_status = 'EXPIRED';
        hasLocalChanges = true;
      }
    }
    if (hasLocalChanges) {
      localStorage.setItem(PRIMARY_STORAGE_KEY, JSON.stringify(list));
      localStorage.setItem('storeku_orders', JSON.stringify(list));
    }

    if (list.length === 0) {
      const emptyTitle = isEn ? 'No Order History Yet' : 'Belum Ada Riwayat Pesanan';
      const emptyDesc = isEn 
        ? 'Orders you place will be automatically recorded in this browser without needing an account.'
        : 'Pesanan yang Anda buat akan otomatis tercatat di browser ini tanpa perlu registrasi akun.';
      const exploreBtnText = isEn ? 'Explore Store Catalog ➔' : 'Jelajahi Katalog Toko ➔';
      const catalogHref = isEn ? '/en/' : '/';

      container.innerHTML = `
        <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted);">
          <div style="font-size: 2.2rem; margin-bottom: 0.5rem; opacity: 0.7;">📦</div>
          <div style="font-weight: 600; color: var(--text-main); margin-bottom: 0.25rem;">${emptyTitle}</div>
          <div style="font-size: 0.82rem; margin-bottom: 1.25rem;">${emptyDesc}</div>
          <a href="${catalogHref}" class="btn-buy" style="display: inline-block; padding: 0.55rem 1.4rem; font-size: 0.85rem; text-decoration: none;" onclick="document.getElementById('historyModal')?.classList.remove('open'); document.body.style.overflow = '';">
            ${exploreBtnText}
          </a>
        </div>
      `;
      return;
    }

    // Check if there are any expired or cancelled orders to show clear banner
    const hasExpiredOrCancelled = list.some(item => item.payment_status === 'EXPIRED' || item.payment_status === 'CANCELLED' || isExpired(item));
    
    let html = '';
    if (hasExpiredOrCancelled) {
      const bannerText = isEn ? '⚠️ Expired / cancelled orders found' : '⚠️ Ditemukan pesanan kadaluarsa / dibatalkan';
      const clearBtnText = isEn ? 'Clear Expired Orders' : 'Bersihkan Riwayat Kadaluarsa';
      html += `
        <div class="history-clear-bar">
          <span>${bannerText}</span>
          <button type="button" class="btn-clear-expired" onclick="DigimestOrders.clearExpiredOrders('${escapeHtml(targetId)}')">${clearBtnText}</button>
        </div>
      `;
    }

    html += list.map(item => {
      const inv = escapeHtml(item.invoice_number);
      const claim = escapeHtml(item.claim_code);
      const name = escapeHtml(item.product_name);
      const qty = item.quantity || 1;
      
      const isBinanceOrder = (item.payment_gateway === 'BINANCE' || item.payment_method === 'BINANCE_PAY');
      const isBep20Order = (item.payment_gateway === 'USDT_BEP20' || item.payment_method === 'CRYPTO' || item.payment_channel === 'BEP20');
      let amountStr;
      if (isBinanceOrder && item.crypto_amount_str) {
        amountStr = `${item.crypto_amount_str} ${item.crypto_currency || 'USDT'}`;
      } else if (isBep20Order && item.crypto_amount_str) {
        amountStr = `${item.crypto_amount_str} USDT (BEP-20)`;
      } else {
        amountStr = formatIDR(item.total_amount);
      }

      let effectiveStatus = item.payment_status || 'PENDING';
      const expiredByTime = effectiveStatus === 'PENDING' && isExpired(item);

      if (effectiveStatus === 'PAID') {
        // Paid item (clickable to claim)
        const claimUrl = isEn ? `/en/claim?code=${encodeURIComponent(item.claim_code || item.invoice_number)}` : `/claim?code=${encodeURIComponent(item.claim_code || item.invoice_number)}`;
        const paidBadge = isEn ? '● Paid' : '● Lunas';
        const claimLabel = isEn ? 'Claim Code:' : 'Kode Klaim:';
        const claimBtn = isEn ? 'View License 🔑' : 'Buka Lisensi 🔑';

        return `
          <div class="order-history-card active-card" onclick="window.location.href='${claimUrl}'">
            <div class="order-card-main">
              <div class="order-card-header">
                <span class="order-card-title">${name}</span>
                <span class="badge-history badge-history-paid">${paidBadge}</span>
              </div>
              <div class="order-card-meta">
                <span>${inv}</span>
                <span>•</span>
                <span>Qty: ${qty}</span>
                <span>•</span>
                <strong style="color: #10b981;">${amountStr}</strong>
              </div>
              <div class="order-card-sub" style="color: #a855f7;">
                ${claimLabel} <code style="color: #c084fc; font-weight: 700;">${claim || '-'}</code>
              </div>
            </div>
            <div class="order-card-action">
              <a href="${claimUrl}" class="btn-history-action btn-history-claim" onclick="event.stopPropagation();">
                ${claimBtn}
              </a>
            </div>
          </div>
        `;
      } else if (effectiveStatus === 'CANCELLED') {
        // Cancelled order (DISABLED, 100% non-clickable with delete button)
        const cancelledBadge = isEn ? '✕ Cancelled' : '✕ Dibatalkan';
        const cancelledSub = isEn ? 'Order was cancelled by buyer' : 'Pesanan telah dibatalkan oleh pembeli';
        const deleteTitle = isEn ? 'Remove from history' : 'Hapus dari riwayat';

        return `
          <div class="order-history-card order-card-disabled">
            <div class="order-card-main">
              <div class="order-card-header">
                <span class="order-card-title" style="color: #9ca3af;">${name}</span>
                <span class="badge-history badge-history-cancelled">${cancelledBadge}</span>
              </div>
              <div class="order-card-meta">
                <span>${inv}</span>
                <span>•</span>
                <span>Qty: ${qty}</span>
                <span>•</span>
                <span>${amountStr}</span>
              </div>
              <div class="order-card-sub" style="color: #6b7280;">
                ${cancelledSub}
              </div>
            </div>
            <div class="order-card-action">
              <span class="btn-history-disabled">${cancelledBadge}</span>
              <button type="button" class="btn-history-delete" title="${deleteTitle}" onclick="event.stopPropagation(); DigimestOrders.removeOrder('${inv}', '${escapeHtml(targetId)}');">✕</button>
            </div>
          </div>
        `;
      } else if (effectiveStatus === 'EXPIRED' || expiredByTime) {
        // Expired order (DISABLED, 100% non-clickable with delete button)
        const expiredBadge = isEn ? '⌛ Expired' : '⌛ Kadaluarsa';
        const expiredSub = isEn ? 'Payment window has expired' : 'Batas waktu bayar telah habis';
        const deleteTitle = isEn ? 'Remove from history' : 'Hapus dari riwayat';

        return `
          <div class="order-history-card order-card-disabled">
            <div class="order-card-main">
              <div class="order-card-header">
                <span class="order-card-title" style="color: #9ca3af;">${name}</span>
                <span class="badge-history badge-history-expired">${expiredBadge}</span>
              </div>
              <div class="order-card-meta">
                <span>${inv}</span>
                <span>•</span>
                <span>Qty: ${qty}</span>
                <span>•</span>
                <span>${amountStr}</span>
              </div>
              <div class="order-card-sub" style="color: #6b7280;">
                ${expiredSub}
              </div>
            </div>
            <div class="order-card-action">
              <span class="btn-history-disabled">${expiredBadge}</span>
              <button type="button" class="btn-history-delete" title="${deleteTitle}" onclick="event.stopPropagation(); DigimestOrders.removeOrder('${inv}', '${escapeHtml(targetId)}');">✕</button>
            </div>
          </div>
        `;
      } else {
        // Unpaid pending order (CLICKABLE to pay with respective gateway)
        const payUrl = isEn ? `/en/payment?inv=${encodeURIComponent(item.invoice_number)}` : `/payment?inv=${encodeURIComponent(item.invoice_number)}`;
        const pendingBadge = isEn ? '⏳ Unpaid' : '⏳ Belum Bayar';
        let pendingSub;
        let payBtn;
        if (isBinanceOrder) {
          pendingSub = isEn ? 'Click to pay via Binance Pay (USDT) now ➔' : 'Klik untuk bayar via Binance Pay (USDT) sekarang ➔';
          payBtn = isEn ? 'Pay Binance ➔' : 'Bayar Binance ➔';
        } else if (isBep20Order) {
          pendingSub = isEn ? 'Click to pay via USDT (BEP-20) now ➔' : 'Klik untuk bayar via USDT (BEP-20) sekarang ➔';
          payBtn = isEn ? 'Pay USDT ➔' : 'Bayar USDT ➔';
        } else {
          pendingSub = isEn ? 'Click to scan & pay QRIS now ➔' : 'Klik untuk scan & bayar QRIS sekarang ➔';
          payBtn = isEn ? 'Pay QRIS ➔' : 'Bayar QRIS ➔';
        }

        return `
          <div class="order-history-card active-card highlight-unpaid" onclick="window.location.href='${payUrl}'">
            <div class="order-card-main">
              <div class="order-card-header">
                <span class="order-card-title">${name}</span>
                <span class="badge-history badge-history-unpaid">${pendingBadge}</span>
              </div>
              <div class="order-card-meta">
                <span>${inv}</span>
                <span>•</span>
                <span>Qty: ${qty}</span>
                <span>•</span>
                <strong style="color: #fbbf24;">${amountStr}</strong>
              </div>
              <div class="order-card-sub" style="color: #fbbf24;">
                ${pendingSub}
              </div>
            </div>
            <div class="order-card-action">
              <a href="${payUrl}" class="btn-history-action btn-history-pay" onclick="event.stopPropagation();">
                ${payBtn}
              </a>
            </div>
          </div>
        `;
      }
    }).join('');

    container.innerHTML = html;

    // Trigger background sync if not skipped
    if (!skipSync) {
      syncPendingOrders(targetId);
    }
  }

  // Unified modal openers & closers
  function openHistoryModal(containerId = 'historyListContainer', modalId = 'historyModal') {
    const targetContainerId = containerId || 'historyListContainer';
    const targetModalId = modalId || 'historyModal';
    renderHistoryList(targetContainerId);
    const modal = document.getElementById(targetModalId);
    if (modal) {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeHistoryModal(modalId = 'historyModal') {
    const targetModalId = modalId || 'historyModal';
    const modal = document.getElementById(targetModalId);
    if (modal) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  // Public Interface
  return {
    getOrders,
    saveOrder,
    updateOrderStatus,
    isExpired,
    removeOrder,
    clearExpiredOrders,
    syncPendingOrders,
    updateBadge,
    renderHistoryList,
    renderHistoryUI: (containerId = 'historyListContainer') => renderHistoryList(containerId || 'historyListContainer'),
    openModal: openHistoryModal,
    closeModal: closeHistoryModal
  };
})();

// Export globally with backwards-compatible aliases
window.DigimestOrders = DigimestOrders;
window.DigihubOrders = DigimestOrders;
window.StoreKuOrders = DigimestOrders;

// Auto-init badge on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  DigimestOrders.updateBadge();
});

// Auto-sync Telegram support username dynamically from /api/config
(async () => {
  try {
    let username = sessionStorage.getItem('digimest_tele_user') || sessionStorage.getItem('digihub_tele_user');
    if (!username) {
      const configUrl = window.digimestApi ? window.digimestApi('/api/config') : '/api/config';
      const res = await fetch(configUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.telegram_username) {
          username = data.telegram_username;
          sessionStorage.setItem('digimest_tele_user', username);
        }
      }
    }
    if (username) {
      document.querySelectorAll('a[href*="t.me/"]').forEach(a => {
        a.href = a.href.replace(/t\.me\/[a-zA-Z0-9_]+/, `t.me/${username}`);
      });
      document.querySelectorAll('[data-tele-cs]').forEach(el => {
        if (el.textContent.includes('Bantuan CS Telegram')) {
          el.textContent = `💬 Bantuan CS Telegram: @${username}`;
        } else if (el.textContent.includes('Chat CS Telegram')) {
          el.textContent = `💬 Chat CS Telegram: @${username}`;
        }
      });
    }
  } catch (e) {}
})();

// Currency Engine & Mobile Navigation have been modularized into:
// - /js/currency.js (window.DigimestCurrency)
// - /js/nav-mobile.js (window.DigimestNav)

