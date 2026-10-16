/**
 * Digimest Frontend API Configuration
 * Production VPS Endpoint: https://digimest.syukurapi.online
 */

// Immediate Language Preference Sync & Routing (runs before page rendering)
(function initLanguagePreference() {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname;
  if (path.startsWith('/admin') || path.startsWith('/api')) return;

  const cleanRoute = path.replace(/^\/+/, '').replace(/\.html$/, '');
  const isEnCurrent = cleanRoute === 'en' || cleanRoute.startsWith('en/');
  const savedLang = localStorage.getItem('digimest_lang');

  // If currently browsing an /en/ URL, sync storage to 'en'
  if (isEnCurrent) {
    if (savedLang !== 'en') {
      try {
        localStorage.setItem('digimest_lang', 'en');
        document.cookie = "digimest_lang=en; path=/; max-age=31536000; SameSite=Lax";
      } catch (e) {}
    }
  } else {
    // If user's stored preference is 'en' or not yet set (default to English):
    if (savedLang === 'en' || !savedLang) {
      if (!savedLang) {
        try {
          localStorage.setItem('digimest_lang', 'en');
          document.cookie = "digimest_lang=en; path=/; max-age=31536000; SameSite=Lax";
        } catch (e) {}
      }
      const baseRoute = (cleanRoute === 'index' || cleanRoute === '') ? '' : cleanRoute;
      const search = window.location.search || '';
      const hash = window.location.hash || '';
      const target = baseRoute ? ('/en/' + baseRoute + search + hash) : ('/en/' + search + hash);
      window.location.replace(target);
    }
  }
})();

(function() {
  const host = window.location.hostname;
  const isLocalDev = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' ||
                     host.endsWith('.test') || host.endsWith('.local') ||
                     window.location.port === '8080' || window.location.port === '3000';
  // Default API VPS: https://digimest.syukurapi.online
  const defaultApi = isLocalDev ? '' : 'https://digimest.syukurapi.online';
  
  window.DIGIMEST_API_BASE = window.DIGIMEST_API_BASE || window.API_BASE || defaultApi;
})();

/**
 * Helper untuk menyusun URL endpoint API secara aman.
 * @param {string} endpoint - Path endpoint (misal: '/api/products' atau 'api/products')
 * @returns {string} Full URL atau relative path
 */
window.digimestApi = function(endpoint) {
  const base = (window.DIGIMEST_API_BASE || '').replace(/\/+$/, '');
  let path = '/' + (endpoint || '').replace(/^\/+/, '');

  // Auto-detect English language context
  const isEn = (typeof document !== 'undefined' && document.documentElement && document.documentElement.lang === 'en') ||
               (typeof window !== 'undefined' && window.location && window.location.pathname.startsWith('/en'));

  if (isEn && (path.startsWith('/api/products') || path.startsWith('/api/public/products'))) {
    if (!path.includes('lang=')) {
      const sep = path.includes('?') ? '&' : '?';
      path = path + sep + 'lang=en';
    }
  }

  return base ? base + path : path;
};

// Current App Build Version
window.STOREKU_BUILD_VERSION = '5.9.5';

// Background Auto-Reload Checker when user returns to tab
(function initVersionWatcher() {
  if (typeof window === 'undefined' || !window.addEventListener) return;
  
  let isChecking = false;
  let lastCheckedTime = 0;
  
  function checkLatestVersion() {
    const now = Date.now();
    // Throttle check to at most once per 60 seconds
    if (isChecking || (now - lastCheckedTime < 60000)) return;
    
    isChecking = true;
    lastCheckedTime = now;
    
    fetch('/version.json?t=' + now, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    })
      .then(res => {
        if (!res.ok) throw new Error('version check failed');
        return res.json();
      })
      .then(data => {
        if (data && data.version && data.version !== window.STOREKU_BUILD_VERSION) {
          console.log('[Storeku] Versi baru terdeteksi:', data.version, '(Versi saat ini:', window.STOREKU_BUILD_VERSION, ')');
          window.location.reload(true);
        }
      })
      .catch(() => {})
      .finally(() => {
        isChecking = false;
      });
  }

  // Check when tab becomes visible again
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkLatestVersion();
    }
  });

  // Check on window focus
  window.addEventListener('focus', checkLatestVersion);
})();
