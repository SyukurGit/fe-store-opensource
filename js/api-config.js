/**
 * Digimest Frontend API Configuration
 * Production VPS Endpoint: https://digimest.syukurapi.online
 */
(function() {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  // Default API VPS: https://digimest.syukurapi.online
  const defaultApi = isLocalhost ? '' : 'https://digimest.syukurapi.online';
  
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
