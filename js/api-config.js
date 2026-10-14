/**
 * Digimest Frontend API Configuration
 * Production VPS Endpoint: https://digimest.syukurapi.online
 */
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
  const path = '/' + (endpoint || '').replace(/^\/+/, '');
  return base ? base + path : path;
};

// Current App Build Version
window.STOREKU_BUILD_VERSION = '5.8.1';

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
