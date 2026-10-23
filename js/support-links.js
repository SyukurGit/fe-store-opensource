/**
 * Digimest Support & Social Links Engine
 * Single source of truth: GET /api/config -> support { whatsapp_url, tiktok_url, threads_url, ... }
 */
(function () {
  'use strict';
  if (window.__digimestSupportLinksLoaded) return;
  window.__digimestSupportLinksLoaded = true;

  const isEn = document.documentElement.lang === 'en' || window.location.pathname.startsWith('/en');

  const TEXT = isEn
    ? {
        heading: 'Support & Social',
        resellerBadge: 'SPECIAL RATES',
        resellerTitle: 'Join Reseller',
        resellerSub: 'Get exclusive wholesale pricing',
        helpKicker: 'CUSTOMER SUPPORT',
        helpTitle: 'Help CS',
        helpSubWa: (num) => `WhatsApp${num ? ' • ' + num : ''} • Fast response 24/7`,
        helpSubGeneric: 'Live chat • Fast response 24/7',
        socialTitle: 'Follow Us',
        helpMessage: 'Hello Digimest, I need help from Customer Support.',
        resellerMessage: 'Hello Digimest, I am interested in joining the Reseller program (special rates).',
        chat: 'Chat',
      }
    : {
        heading: 'Bantuan & Sosial',
        resellerBadge: 'PROMO KHUSUS',
        resellerTitle: 'Join Reseller',
        resellerSub: 'Dapatkan harga khusus jauh lebih murah',
        helpKicker: 'LAYANAN PELANGGAN',
        helpTitle: 'Help CS',
        helpSubWa: (num) => `WhatsApp${num ? ' • ' + num : ''} • Respon cepat 24/7`,
        helpSubGeneric: 'Live chat • Respon cepat 24/7',
        socialTitle: 'Ikuti Kami',
        helpMessage: 'Halo Digimest, saya butuh bantuan Customer Support.',
        resellerMessage: 'Halo Digimest, saya tertarik join Reseller (harga khusus).',
        chat: 'Chat',
      };

  const ICONS = {
    whatsapp:
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>',
    tiktok:
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>',
    threads:
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32L7.734 7.847c.98-1.454 2.568-2.256 4.478-2.256h.044c3.194.02 5.097 1.975 5.287 5.388.108.046.216.094.321.142 1.49.7 2.58 1.761 3.154 3.07.797 1.82.871 4.79-1.548 7.158-1.85 1.81-4.094 2.628-7.277 2.65Zm1.003-11.69c-.242 0-.487.007-.739.021-1.836.103-2.98.946-2.916 2.143.067 1.256 1.452 1.839 2.784 1.767 1.224-.065 2.818-.543 3.086-3.71a10.5 10.5 0 0 0-2.215-.221z"/></svg>',
    arrow:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>',
  };

  let support = {};
  let legacyTelegramUrl = '';

  function absUrl(raw) {
    if (!raw) return '';
    try {
      return new URL(raw, window.location.origin).toString();
    } catch (e) {
      return '';
    }
  }

  function withPrefill(raw, message) {
    const base = absUrl(raw);
    if (!base) return '';
    if (!base.includes('wa.me')) return base;
    try {
      const url = new URL(base);
      if (message) url.searchParams.set('text', message);
      return url.toString();
    } catch (e) {
      return base;
    }
  }

  function prettyNumber() {
    const raw = (support.whatsapp_number || '').replace(/[^\d+]/g, '');
    if (!raw) return '';
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('62') && digits.length > 8) {
      const rest = digits.slice(2);
      const grouped = rest.replace(/(\d{3})(\d{3,4})(\d{0,4}).*/, '$1-$2-$3').replace(/-$/, '');
      return '+62 ' + grouped;
    }
    return raw;
  }

  function helpHref(message) {
    if (support.whatsapp_url) return withPrefill(support.whatsapp_url, message || TEXT.helpMessage);
    return legacyTelegramUrl || '#';
  }

  function resellerHref() {
    if (support.reseller_url) return withPrefill(support.reseller_url, TEXT.resellerMessage);
    return helpHref(TEXT.resellerMessage);
  }

  function footerMarkup() {
    return `
      <h5>${TEXT.heading}</h5>
      <a href="#" target="_blank" rel="noopener noreferrer" class="footer-reseller-card" data-support-reseller>
        <div class="reseller-badge-mini">${TEXT.resellerBadge}</div>
        <div class="reseller-title">${TEXT.resellerTitle}</div>
        <div class="reseller-sub" data-support-reseller-sub>${TEXT.resellerSub}</div>
      </a>
      <a href="#" target="_blank" rel="noopener noreferrer" class="footer-help-card" data-support-help aria-label="${TEXT.helpTitle}">
        <span class="footer-help-icon">${ICONS.whatsapp}</span>
        <span class="footer-help-copy">
          <span class="footer-help-kicker">${TEXT.helpKicker}</span>
          <span class="footer-help-title">${TEXT.helpTitle}</span>
          <span class="footer-help-sub" data-support-help-sub>${TEXT.helpSubGeneric}</span>
        </span>
        <span class="footer-help-arrow">${ICONS.arrow}</span>
      </a>
      <div class="footer-social-block">
        <span class="footer-social-title">${TEXT.socialTitle}</span>
        <div class="footer-social-icons">
          <a href="#" target="_blank" rel="noopener noreferrer" class="footer-social-btn social-tiktok" data-social="tiktok" title="TikTok" aria-label="TikTok">${ICONS.tiktok}</a>
          <a href="#" target="_blank" rel="noopener noreferrer" class="footer-social-btn social-threads" data-social="threads" title="Threads" aria-label="Threads">${ICONS.threads}</a>
          <a href="#" target="_blank" rel="noopener noreferrer" class="footer-social-btn social-whatsapp" data-social="whatsapp" title="WhatsApp" aria-label="WhatsApp">${ICONS.whatsapp}</a>
        </div>
      </div>`;
  }

  function ensureFooterMarkup() {
    document.querySelectorAll('.footer-col-action').forEach((col) => {
      if (col.querySelector('[data-support-help]')) return;
      col.innerHTML = footerMarkup();
    });
  }

  function replaceTelegramWords(root) {
    if (!support.whatsapp_url || !root) return;
    const number = prettyNumber();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (/^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA)$/i.test(parent.tagName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      let value = node.nodeValue;
      if (!value || !/Telegram|@[A-Za-z0-9_]{3,}/.test(value)) return;
      value = value.replace(/Telegram/gi, 'WhatsApp');
      value = value.replace(/@[A-Za-z0-9_]{3,}/g, number || 'WhatsApp');
      node.nodeValue = value;
    });
  }

  function setText(el, value) {
    if (el && el.textContent !== value) el.textContent = value;
  }

  function setHref(el, url) {
    if (el && el.getAttribute('href') !== url) el.setAttribute('href', url);
  }

  function applySocial(selector, url) {
    document.querySelectorAll(selector).forEach((el) => {
      if (!url) {
        if (el.style.display !== 'none') el.style.display = 'none';
        el.setAttribute('aria-hidden', 'true');
        return;
      }
      if (el.style.display === 'none') el.style.display = '';
      el.removeAttribute('aria-hidden');
      setHref(el, url);
    });
  }

  function applySupport() {
    ensureFooterMarkup();

    const waNumber = prettyNumber();
    document.querySelectorAll('[data-support-help]').forEach((el) => {
      setHref(el, helpHref());
      el.title = support.whatsapp_url ? `${TEXT.helpTitle} • WhatsApp` : TEXT.helpTitle;
    });
    document.querySelectorAll('[data-support-help-sub]').forEach((el) => {
      setText(el, support.whatsapp_url ? TEXT.helpSubWa(waNumber) : TEXT.helpSubGeneric);
    });
    document.querySelectorAll('[data-support-reseller]').forEach((el) => {
      setHref(el, resellerHref());
    });
    document.querySelectorAll('[data-support-reseller-sub]').forEach((el) => {
      setText(el, TEXT.resellerSub);
    });

    applySocial('[data-social="tiktok"]', support.tiktok_url);
    applySocial('[data-social="threads"]', support.threads_url);
    applySocial('[data-social="whatsapp"]', support.whatsapp_social_url || support.whatsapp_url);

    document.querySelectorAll('[data-tele-cs], [data-tele-drawer-cs]').forEach((el) => {
      const customMessage = el.getAttribute('data-support-message');
      setHref(el, helpHref(customMessage || undefined));
      el.target = '_blank';
      el.rel = 'noopener noreferrer';
      if (support.whatsapp_url) {
        const label = el.querySelector('.drawer-item-text');
        if (label) {
          setText(label, label.textContent.replace(/Telegram/gi, 'WhatsApp'));
        } else {
          replaceTelegramWords(el);
        }
      }
    });
    document.querySelectorAll('[data-tele-reseller]').forEach((el) => {
      setHref(el, resellerHref());
    });
    document.querySelectorAll('[data-tele-float]').forEach((el) => {
      setHref(el, helpHref());
      const label = el.querySelector('span');
      if (label) setText(label, support.whatsapp_url ? 'Help CS' : 'Chat CS');
      el.title = support.whatsapp_url ? 'Chat Help CS WhatsApp 24/7' : 'Chat Help CS 24/7';
      el.setAttribute('aria-label', support.whatsapp_url ? 'WhatsApp Customer Support' : 'Customer Support');
      const icon = el.querySelector('.floating-telegram-icon, .floating-cs-icon');
      if (icon && !icon.dataset.supportIcon) {
        icon.dataset.supportIcon = 'whatsapp';
        icon.innerHTML = ICONS.whatsapp;
      }
    });

    window.dispatchEvent(new CustomEvent('digimest:support-ready', { detail: support }));
  }

  function normalizeSupport(raw) {
    const src = raw || {};
    return {
      whatsapp_number: src.whatsapp_number || '',
      whatsapp_url: src.whatsapp_url || '',
      tiktok_url: src.tiktok_url || '',
      threads_url: src.threads_url || '',
      whatsapp_social_url: src.whatsapp_social_url || '',
      reseller_url: src.reseller_url || '',
    };
  }

  async function loadConfig() {
    try {
      const endpoint = window.digimestApi ? window.digimestApi('/api/config') : '/api/config';
      const res = await fetch(endpoint, { cache: 'no-store' });
      if (!res.ok) return;
      const payload = await res.json();
      const data = payload.data || payload;
      support = normalizeSupport(data.support || payload.support);
      legacyTelegramUrl = data.telegram_url || payload.telegram_url || '';
    } catch (e) {
      support = normalizeSupport(window.__digimestSupportConfig);
    }
  }

  window.DigimestSupport = {
    get config() {
      return support;
    },
    get helpUrl() {
      return helpHref();
    },
    get resellerUrl() {
      return resellerHref();
    },
    openHelp(message) {
      const url = helpHref(message);
      if (url && url !== '#') window.open(url, '_blank', 'noopener');
    },
    refresh: applySupport,
  };

  window.addEventListener('appconfigloaded', (event) => {
    const detail = event.detail || {};
    if (detail.support) {
      support = normalizeSupport(detail.support);
      window.__digimestSupportConfig = support;
      if (detail.telegram_url) legacyTelegramUrl = detail.telegram_url;
      applySupport();
    }
  });

  function boot() {
    ensureFooterMarkup();
    applySupport();
    loadConfig().then(() => {
      window.__digimestSupportConfig = support;
      applySupport();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  const observer = new MutationObserver((mutations) => {
    const hasNewElement = mutations.some((m) =>
      Array.from(m.addedNodes || []).some((node) => node.nodeType === 1)
    );
    if (!hasNewElement) return;
    clearTimeout(observer._timer);
    observer._timer = setTimeout(() => {
      ensureFooterMarkup();
      applySupport();
    }, 40);
  });
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }
})();
