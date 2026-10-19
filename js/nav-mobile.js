/**
 * Digimest Mobile Navigation & Locale Controller
 * Handles mobile drawer, responsive hamburger, language switching, and currency triggers.
 */

(function(window) {
  'use strict';

  function initMobileNav() {
    const hamburgerBtn = document.getElementById('navHamburgerBtn');
    const drawerOverlay = document.getElementById('mobileDrawerOverlay');
    const drawerCloseBtn = document.getElementById('drawerCloseBtn');
    const drawerHistoryBtn = document.getElementById('drawerOpenHistoryBtn');
    const langBtn = document.getElementById('langDropdownBtn');
    const langWrap = langBtn?.closest('.lang-dropdown-wrap');
    const curBtn = document.getElementById('currencyDropdownBtn');
    const curWrap = curBtn?.closest('.currency-dropdown-wrap');

    function openDrawer() {
      hamburgerBtn?.classList.add('open');
      drawerOverlay?.classList.add('open');
      document.body.style.overflow = 'hidden';
      // Sync UI on drawer open
      window.DigimestCurrency?.syncUI?.();
    }

    function closeDrawer() {
      hamburgerBtn?.classList.remove('open');
      drawerOverlay?.classList.remove('open');
      document.body.style.overflow = '';
    }

    // Hamburger button toggle
    hamburgerBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (drawerOverlay?.classList.contains('open')) {
        closeDrawer();
      } else {
        openDrawer();
      }
    });

    // Close button & overlay click
    drawerCloseBtn?.addEventListener('click', closeDrawer);

    drawerOverlay?.addEventListener('click', (e) => {
      if (e.target === drawerOverlay) {
        closeDrawer();
      }
    });

    // Language Dropdown Toggle (Desktop)
    langBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      curWrap?.classList.remove('open');
      langWrap?.classList.toggle('open');
    });

    // Currency Dropdown Toggle (Desktop)
    curBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      langWrap?.classList.remove('open');
      curWrap?.classList.toggle('open');
    });

    // Close dropdowns on outside click
    document.addEventListener('click', (e) => {
      if (langWrap && !langWrap.contains(e.target)) {
        langWrap.classList.remove('open');
      }
      if (curWrap && !curWrap.contains(e.target)) {
        curWrap.classList.remove('open');
      }
    });

    // Desktop Currency Switcher items click
    document.querySelectorAll('.currency-item').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const targetCur = el.getAttribute('data-currency');
        curWrap?.classList.remove('open');
        window.DigimestCurrency?.setCurrency?.(targetCur, true);
      });
    });

    // Mobile Drawer Currency items click
    document.querySelectorAll('.drawer-currency-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetCur = btn.getAttribute('data-currency');
        window.DigimestCurrency?.setCurrency?.(targetCur, true);
      });
    });

    // Sync Currency UI
    window.DigimestCurrency?.syncUI?.();

    // Sync Language Switcher UI with current page language
    const isEnPage = (document.documentElement.lang === 'en') || window.location.pathname.startsWith('/en');

    // Update navbar button label & flag if English
    if (isEnPage && langBtn) {
      langBtn.innerHTML = `
        <svg class="svg-flag" viewBox="0 0 60 40" aria-hidden="true"><rect width="60" height="40" fill="#012169"/><path d="M0 0L60 40M60 0L0 40" stroke="#ffffff" stroke-width="8"/><path d="M0 0L60 40M60 0L0 40" stroke="#c8102e" stroke-width="3.5"/><path d="M30 0V40M0 20H60" stroke="#ffffff" stroke-width="12"/><path d="M30 0V40M0 20H60" stroke="#c8102e" stroke-width="7"/></svg>
        <span class="lang-code">EN</span>
        <span class="lang-arrow">▾</span>
      `;
    }

    // Update active checkmarks in menu & drawer
    document.querySelectorAll('[data-lang]').forEach(el => {
      const lang = el.getAttribute('data-lang');
      const check = el.querySelector('.lang-check');
      if (lang === 'en') {
        if (isEnPage) {
          el.classList.add('active');
          if (check) check.style.visibility = 'visible';
        } else {
          el.classList.remove('active');
          if (check) check.style.visibility = 'hidden';
        }
      } else if (lang === 'id') {
        if (!isEnPage) {
          el.classList.add('active');
          if (check) check.style.visibility = 'visible';
        } else {
          el.classList.remove('active');
          if (check) check.style.visibility = 'hidden';
        }
      }
    });

    // Automatic Link Enforcer for English pages: ensures all internal links stay within /en/
    if (isEnPage) {
      document.querySelectorAll('a[href]').forEach(a => {
        let href = a.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('//') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
        if (href.startsWith('/admin') || href.startsWith('/api') || href.startsWith('/en/') || href.startsWith('/css/') || href.startsWith('/js/') || href.startsWith('/logo/')) return;
        
        if (href === '/' || href === '/index.html') {
          a.setAttribute('href', '/en/');
        } else if (href.startsWith('/')) {
          a.setAttribute('href', '/en' + href);
        }
      });
    }

    // Language item click with intelligent path mapping & smart currency transition
    document.querySelectorAll('[data-lang]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const targetLang = el.getAttribute('data-lang');
        const currentPath = window.location.pathname;
        const currentSearch = window.location.search;
        const currentHash = window.location.hash;

        closeDrawer();
        langWrap?.classList.remove('open');

        // Extract clean route (e.g. '/product', '/en/how-to-buy.html' -> 'how-to-buy')
        let cleanRoute = currentPath.replace(/^\/+/, '').replace(/\.html$/, '');
        let isEnCurrent = cleanRoute === 'en' || cleanRoute.startsWith('en/');
        let baseRoute = isEnCurrent ? cleanRoute.replace(/^en\/?/, '') : cleanRoute;

        if (targetLang === 'en') {
          try {
            localStorage.setItem('digimest_lang', 'en');
            document.cookie = "digimest_lang=en; path=/; max-age=31536000; SameSite=Lax";
            // SMART CURRENCY TRANSITION:
            // If user has not manually locked currency, auto switch to USD
            if (!localStorage.getItem('digimest_currency_manual')) {
              localStorage.setItem('digimest_currency', 'USD');
            }
          } catch (err) {}
          if (isEnCurrent) return;
          let targetPath = '/en/' + currentSearch + currentHash;
          if (baseRoute && baseRoute !== 'index') {
            targetPath = '/en/' + baseRoute + currentSearch + currentHash;
          }
          window.location.href = targetPath;
        } else if (targetLang === 'id') {
          try {
            localStorage.setItem('digimest_lang', 'id');
            document.cookie = "digimest_lang=id; path=/; max-age=31536000; SameSite=Lax";
            // SMART CURRENCY TRANSITION:
            // If user has not manually locked currency, auto switch to IDR
            if (!localStorage.getItem('digimest_currency_manual')) {
              localStorage.setItem('digimest_currency', 'IDR');
            }
          } catch (err) {}
          if (!isEnCurrent) return;
          let targetPath = '/' + currentSearch + currentHash;
          if (baseRoute && baseRoute !== 'index') {
            targetPath = '/' + baseRoute + currentSearch + currentHash;
          }
          window.location.href = targetPath;
        }
      });
    });

    // When drawer history button is clicked, close drawer and open history modal
    drawerHistoryBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      closeDrawer();
      setTimeout(() => {
        if (window.DigimestOrders && typeof window.DigimestOrders.openModal === 'function') {
          window.DigimestOrders.openModal('historyListContainer', 'historyModal');
        } else if (typeof openHistoryModal === 'function') {
          openHistoryModal('historyListContainer', 'historyModal');
        }
      }, 150);
    });

    // Central modal close listeners
    document.getElementById('closeHistoryBtn')?.addEventListener('click', () => {
      if (window.DigimestOrders && typeof window.DigimestOrders.closeModal === 'function') {
        window.DigimestOrders.closeModal('historyModal');
      } else if (typeof closeHistoryModal === 'function') {
        closeHistoryModal('historyModal');
      }
    });

    document.getElementById('historyModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'historyModal') {
        if (window.DigimestOrders && typeof window.DigimestOrders.closeModal === 'function') {
          window.DigimestOrders.closeModal('historyModal');
        } else if (typeof closeHistoryModal === 'function') {
          closeHistoryModal('historyModal');
        }
      }
    });

    return {
      openDrawer,
      closeDrawer
    };
  }

  // Expose module namespace
  window.DigimestNav = {
    init: initMobileNav
  };
  window.initMobileNav = initMobileNav;

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileNav);
  } else {
    initMobileNav();
  }

})(typeof window !== 'undefined' ? window : this);
