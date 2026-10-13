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
