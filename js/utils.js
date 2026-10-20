/**
 * Digimest Core Frontend Shared Utilities
 * Unified helpers for currency formatting, HTML escaping, clipboard, and notifications.
 */

(function(window) {
  'use strict';

  const DigimestUtils = {
    /**
     * Format currency dynamically based on current user selection (IDR or USD)
     */
    formatCurrency: function(amountIDR, amountUSD = 0) {
      if (window.DigimestCurrency && typeof window.DigimestCurrency.format === 'function') {
        return window.DigimestCurrency.format(amountIDR, amountUSD);
      }
      return 'Rp ' + Number(amountIDR || 0).toLocaleString('id-ID');
    },

    /**
     * Format IDR amount directly
     */
    formatIDR: function(num) {
      return DigimestUtils.formatCurrency(num, 0);
    },

    /**
     * Escape special HTML characters to prevent XSS injection
     */
    escapeHtml: function(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    },

    /**
     * Validate a URL coming from API/admin data before placing it in src/href.
     * Only http(s) URLs and same-origin relative paths are allowed.
     */
    safeUrl: function(value, fallback = '') {
      if (!value) return fallback;
      try {
        const parsed = new URL(String(value), window.location.origin);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          return parsed.href;
        }
      } catch (e) {}
      return fallback;
    },

    /**
     * Display a floating toast notification message
     */
    showToast: function(msg) {
      const toast = document.getElementById('toast');
      if (!toast) return;
      toast.textContent = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2500);
    },

    /**
     * Copy text to user clipboard with toast feedback
     */
    copyText: function(text) {
      const isEn = (document.documentElement && document.documentElement.lang === 'en') ||
                   (typeof window !== 'undefined' && window.location && window.location.pathname.startsWith('/en'));
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          DigimestUtils.showToast(isEn ? 'Copied to clipboard! 📋' : 'Berhasil disalin ke clipboard! 📋');
        }).catch(() => {
          DigimestUtils.fallbackCopyText(text, isEn);
        });
      } else {
        DigimestUtils.fallbackCopyText(text, isEn);
      }
    },

    /**
     * Fallback copy mechanism using textarea
     */
    fallbackCopyText: function(text, isEn) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        DigimestUtils.showToast(isEn ? 'Copied to clipboard! 📋' : 'Berhasil disalin!');
      } catch (e) {
        DigimestUtils.showToast(isEn ? 'Failed to copy.' : 'Gagal menyalin.');
      }
    },

    /**
     * Parse date/timestamp into milliseconds
     */
    parseTimestamp: function(dateStr) {
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
  };

  // Expose namespace
  window.DigimestUtils = DigimestUtils;

  // Global backward-compatible aliases
  if (!window.formatCurrency) window.formatCurrency = DigimestUtils.formatCurrency;
  if (!window.formatIDR) window.formatIDR = DigimestUtils.formatIDR;
  if (!window.escapeHtml) window.escapeHtml = DigimestUtils.escapeHtml;
  if (!window.safeUrl) window.safeUrl = DigimestUtils.safeUrl;
  if (!window.showToast) window.showToast = DigimestUtils.showToast;
  if (!window.copyText) window.copyText = DigimestUtils.copyText;
  if (!window.parseTimestamp) window.parseTimestamp = DigimestUtils.parseTimestamp;

})(typeof window !== 'undefined' ? window : this);
