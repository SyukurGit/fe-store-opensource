/**
 * Digimest Support & Social Links Engine
 * Single source of truth: GET /api/config -> support { whatsapp_url, telegram_url, tiktok_url, threads_url, ... }
 *
 * Help CS has two separate channels:
 * - WhatsApp (primary)
 * - Telegram (secondary)
 * The Help CS mark itself stays a customer-support icon; each channel keeps its own brand logo.
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
        socialTitle: 'Follow Us',
        helpMessage: 'Hello Digimest, I need help from Customer Support.',
        resellerMessage: 'Hello Digimest, I am interested in joining the Reseller program (special rates).',
        both: 'WhatsApp & Telegram • Fast response 24/7',
        waOnly: (num) => `WhatsApp${num ? ' • ' + num : ''} • Fast response 24/7`,
        tgOnly: (user) => `Telegram${user ? ' • @' + user : ''} • Fast response 24/7`,
        generic: 'Live chat • Fast response 24/7',
      }
    : {
        heading: 'Bantuan & Sosial',
        resellerBadge: 'PROMO KHUSUS',
        resellerTitle: 'Join Reseller',
        resellerSub: 'Dapatkan harga khusus jauh lebih murah',
        helpKicker: 'LAYANAN PELANGGAN',
        helpTitle: 'Help CS',
        socialTitle: 'Ikuti Kami',
        helpMessage: 'Halo Digimest, saya butuh bantuan Customer Support.',
        resellerMessage: 'Halo Digimest, saya tertarik join Reseller (harga khusus).',
        both: 'WhatsApp & Telegram • Respon cepat 24/7',
        waOnly: (num) => `WhatsApp${num ? ' • ' + num : ''} • Respon cepat 24/7`,
        tgOnly: (user) => `Telegram${user ? ' • @' + user : ''} • Respon cepat 24/7`,
        generic: 'Live chat • Respon cepat 24/7',
      };

  const ICONS = {
    headset:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="2" y="13" width="4" height="6" rx="2"/><rect x="18" y="13" width="4" height="6" rx="2"/><path d="M18 19a3 3 0 0 1-3 3h-2"/></svg>',
    whatsapp:
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>',
    telegram:
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>',
    tiktok:
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>',
    threads:
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32L7.734 7.847c.98-1.454 2.568-2.256 4.478-2.256h.044c3.194.02 5.097 1.975 5.287 5.388.108.046.216.094.321.142 1.49.7 2.58 1.761 3.154 3.07.797 1.82.871 4.79-1.548 7.158-1.85 1.81-4.094 2.628-7.277 2.65Zm1.003-11.69c-.242 0-.487.007-.739.021-1.836.103-2.98.946-2.916 2.143.067 1.256 1.452 1.839 2.784 1.767 1.224-.065 2.818-.543 3.086-3.71a10.5 10.5 0 0 0-2.215-.221z"/></svg>',
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
    try {
      const url = new URL(base);
      if (message && (base.includes('wa.me') || base.includes('t.me') || base.includes('telegram.me'))) {
        url.searchParams.set('text', message);
      }
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

  function whatsAppHref(message) {
    if (!support.whatsapp_url) return '';
    return withPrefill(support.whatsapp_url, message || TEXT.helpMessage);
  }

  function telegramHref(message) {
    const url = support.telegram_url || legacyTelegramUrl;
    if (!url) return '';
    return withPrefill(url, message);
  }

  function helpHref(message) {
    return whatsAppHref(message) || telegramHref(message) || '#';
  }

  function resellerHref() {
    if (support.reseller_url) return withPrefill(support.reseller_url, TEXT.resellerMessage);
    return whatsAppHref(TEXT.resellerMessage) || telegramHref(TEXT.resellerMessage) || '#';
  }

  function helpSubText() {
    const hasWa = !!support.whatsapp_url;
    const hasTg = !!(support.telegram_url || legacyTelegramUrl);
    if (hasWa && hasTg) return TEXT.both;
    if (hasWa) return TEXT.waOnly(prettyNumber());
    if (hasTg) return TEXT.tgOnly(support.telegram_username);
    return TEXT.generic;
  }

  function footerMarkup() {
    return `
      <h5>${TEXT.heading}</h5>
      <a href="#" target="_blank" rel="noopener noreferrer" class="footer-reseller-card" data-support-reseller>
        <div class="reseller-badge-mini">${TEXT.resellerBadge}</div>
        <div class="reseller-title">${TEXT.resellerTitle}</div>
        <div class="reseller-sub" data-support-reseller-sub>${TEXT.resellerSub}</div>
      </a>
      <div class="footer-help-panel" data-support-panel>
        <div class="footer-help-head">
          <span class="footer-help-icon">${ICONS.headset}</span>
          <span class="footer-help-copy">
            <span class="footer-help-kicker">${TEXT.helpKicker}</span>
            <span class="footer-help-title">${TEXT.helpTitle}</span>
            <span class="footer-help-sub" data-support-help-sub>${TEXT.generic}</span>
          </span>
        </div>
        <div class="footer-help-channels">
          <a href="#" target="_blank" rel="noopener noreferrer" class="footer-channel footer-channel-wa" data-support-wa>
            <span class="footer-channel-icon">${ICONS.whatsapp}</span>
            <span class="footer-channel-copy">
              <span class="footer-channel-label">WhatsApp</span>
              <span class="footer-channel-value" data-support-wa-value>WhatsApp CS</span>
            </span>
            <span class="footer-channel-badge" data-support-primary-badge>PRIMARY</span>
          </a>
          <a href="#" target="_blank" rel="noopener noreferrer" class="footer-channel footer-channel-tg" data-support-telegram>
            <span class="footer-channel-icon">${ICONS.telegram}</span>
            <span class="footer-channel-copy">
              <span class="footer-channel-label">Telegram</span>
              <span class="footer-channel-value" data-support-telegram-value>Telegram CS</span>
            </span>
            <span class="footer-channel-badge footer-channel-badge-alt">SECONDARY</span>
          </a>
        </div>
      </div>
      <div class="footer-social-block">
        <span class="footer-social-title">${TEXT.socialTitle}</span>
        <div class="footer-social-icons">
          <a href="#" target="_blank" rel="noopener noreferrer" class="footer-social-btn social-tiktok" data-social="tiktok" title="TikTok" aria-label="TikTok">${ICONS.tiktok}</a>
          <a href="#" target="_blank" rel="noopener noreferrer" class="footer-social-btn social-threads" data-social="threads" title="Threads" aria-label="Threads">${ICONS.threads}</a>
        </div>
      </div>`;
  }

  function ensureFooterMarkup() {
    document.querySelectorAll('.footer-col-action').forEach((col) => {
      if (col.querySelector('[data-support-panel]')) return;
      col.innerHTML = footerMarkup();
    });
  }

  function setText(el, value) {
    if (el && el.textContent !== value) el.textContent = value;
  }

  function setHref(el, url) {
    if (el && el.getAttribute('href') !== url) el.setAttribute('href', url);
  }

  function show(el, visible) {
    if (!el) return;
    const next = visible ? '' : 'none';
    if (el.style.display !== next) el.style.display = next;
    if (visible) {
      el.removeAttribute('aria-hidden');
    } else {
      el.setAttribute('aria-hidden', 'true');
    }
  }

  function applySupport() {
    ensureFooterMarkup();

    const hasWa = !!support.whatsapp_url;
    const hasTg = !!(support.telegram_url || legacyTelegramUrl);
    const waNumber = prettyNumber();
    const tgUser = support.telegram_username || '';

    document.querySelectorAll('[data-support-help-sub]').forEach((el) => {
      setText(el, helpSubText());
    });

    document.querySelectorAll('[data-support-wa]').forEach((el) => {
      show(el, hasWa);
      setHref(el, whatsAppHref());
      el.title = hasWa ? `WhatsApp ${waNumber}` : 'WhatsApp';
    });
    document.querySelectorAll('[data-support-wa-value]').forEach((el) => {
      setText(el, waNumber || 'WhatsApp CS');
    });

    document.querySelectorAll('[data-support-telegram]').forEach((el) => {
      show(el, hasTg);
      setHref(el, telegramHref());
      el.title = hasTg ? `Telegram @${tgUser}` : 'Telegram';
    });
    document.querySelectorAll('[data-support-telegram-value]').forEach((el) => {
      setText(el, tgUser ? '@' + tgUser : 'Telegram CS');
    });

    document.querySelectorAll('[data-support-reseller]').forEach((el) => {
      setHref(el, resellerHref());
    });
    document.querySelectorAll('[data-support-reseller-sub]').forEach((el) => {
      setText(el, TEXT.resellerSub);
    });

    document.querySelectorAll('[data-social="tiktok"]').forEach((el) => {
      show(el, !!support.tiktok_url);
      if (support.tiktok_url) setHref(el, support.tiktok_url);
    });
    document.querySelectorAll('[data-social="threads"]').forEach((el) => {
      show(el, !!support.threads_url);
      if (support.threads_url) setHref(el, support.threads_url);
    });

    document.querySelectorAll('[data-tele-cs]').forEach((el) => {
      const customMessage = el.getAttribute('data-support-message');
      setHref(el, helpHref(customMessage || undefined));
      el.target = '_blank';
      el.rel = 'noopener noreferrer';
    });

    document.querySelectorAll('[data-tele-float]').forEach((el) => {
      setHref(el, helpHref());
      const label = el.querySelector('span');
      if (label) setText(label, 'Help CS');
      el.title = hasWa ? 'Chat Help CS WhatsApp 24/7' : (hasTg ? 'Chat Help CS Telegram 24/7' : 'Chat Help CS 24/7');
      el.setAttribute('aria-label', hasWa ? 'WhatsApp Customer Support' : 'Customer Support');
    });

    window.dispatchEvent(new CustomEvent('digimest:support-ready', { detail: support }));
  }

  function normalizeSupport(raw) {
    const src = raw || {};
    return {
      whatsapp_number: src.whatsapp_number || '',
      whatsapp_url: src.whatsapp_url || '',
      telegram_username: src.telegram_username || '',
      telegram_url: src.telegram_url || '',
      tiktok_url: src.tiktok_url || '',
      threads_url: src.threads_url || '',
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
    get whatsappUrl() {
      return whatsAppHref();
    },
    get telegramUrl() {
      return telegramHref();
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
