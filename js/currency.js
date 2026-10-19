/**
 * Digimest Currency Manager (USD & IDR Smart Switcher)
 * Multi-currency conversion, real-time rate sync, and reactive UI state.
 */

(function(window) {
  'use strict';

  const DigimestCurrency = {
    getCurrency: function() {
      try {
        return localStorage.getItem('digimest_currency') || 'IDR';
      } catch (e) {
        return 'IDR';
      }
    },

    getRate: function() {
      return window.digimestUSDRate || parseFloat(sessionStorage.getItem('digimest_usd_rate')) || 18000;
    },

    setCurrency: function(curr, isManual = true) {
      const cur = (curr === 'USD') ? 'USD' : 'IDR';
      try {
        localStorage.setItem('digimest_currency', cur);
        if (isManual) {
          localStorage.setItem('digimest_currency_manual', '1');
        }
      } catch (e) {}
      this.syncUI();
      window.dispatchEvent(new CustomEvent('currencychange', { detail: { currency: cur } }));
    },

    format: function(amountIDR, amountUSD = 0) {
      const cur = this.getCurrency();
      if (cur === 'USD') {
        const rate = this.getRate();
        // Always compute retail USD from amountIDR (the single source of truth for final price & promo)
        let usdVal = Number(amountIDR || 0) / rate;
        return '$' + usdVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
      }).format(Number(amountIDR || 0));
    },

    formatEstimate: function(amountIDR, amountUSD = 0) {
      const cur = this.getCurrency();
      const rate = this.getRate();
      if (cur === 'USD') {
        const idrVal = Number(amountIDR || 0);
        return `~Rp ${idrVal.toLocaleString('id-ID')}`;
      } else {
        const usdVal = amountUSD > 0 ? amountUSD : (Number(amountIDR || 0) / rate);
        return `~$${usdVal.toFixed(2)}`;
      }
    },

    syncUI: function() {
      const cur = this.getCurrency();
      const isUSD = cur === 'USD';

      // Update Desktop Navbar Button
      const desktopCode = document.getElementById('desktopCurrencyCode');
      const desktopSymbol = document.querySelector('.currency-symbol-icon');
      if (desktopCode) desktopCode.textContent = cur;
      if (desktopSymbol) desktopSymbol.textContent = isUSD ? '$' : 'Rp';

      // Update Desktop Menu items checkmarks & active class
      document.querySelectorAll('.currency-item').forEach(el => {
        const itemCur = el.getAttribute('data-currency');
        const check = el.querySelector('.currency-check');
        const isActive = itemCur === cur;
        el.classList.toggle('active', isActive);
        if (check) check.style.visibility = isActive ? 'visible' : 'hidden';
      });

      // Update Mobile Drawer items
      document.querySelectorAll('.drawer-currency-btn').forEach(btn => {
        const btnCur = btn.getAttribute('data-currency');
        const check = btn.querySelector('.currency-check');
        const isActive = btnCur === cur;
        btn.classList.toggle('active', isActive);
        if (check) check.style.visibility = isActive ? 'visible' : 'hidden';
      });
    }
  };

  // Expose namespace
  window.DigimestCurrency = DigimestCurrency;

  // Listen to app config loaded to update rate if changed
  window.addEventListener('appconfigloaded', () => {
    DigimestCurrency.syncUI();
  });

  // Cross-tab currency sync
  window.addEventListener('storage', (e) => {
    if (e.key === 'digimest_currency') {
      DigimestCurrency.syncUI();
      window.dispatchEvent(new CustomEvent('currencychange', { detail: { currency: e.newValue } }));
    }
  });

  // Auto-sync UI when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => DigimestCurrency.syncUI());
  } else {
    DigimestCurrency.syncUI();
  }

})(typeof window !== 'undefined' ? window : this);
