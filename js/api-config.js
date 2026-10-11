/**
 * Digimest Frontend API Configuration
 * 
 * Pengaturan Endpoint API:
 * 1. Default (Kosong ""):
 *    Semua request API (/api/...) memanggil domain yang sama.
 *    Sangat cocok untuk:
 *    - Development lokal di localhost / Laragon.
 *    - Cloudflare Pages yang menggunakan reverse proxy via file `_redirects` (/api/* -> VPS).
 * 
 * 2. Direct Cross-Origin VPS (Opsional):
 *    Jika Anda ingin frontend memanggil langsung VPS tanpa melalui reverse proxy Cloudflare Pages,
 *    isi nilai di bawah dengan domain VPS Anda:
 *    Contoh: window.DIGIMEST_API_BASE = 'https://api.digimest.tech';
 */
window.DIGIMEST_API_BASE = window.DIGIMEST_API_BASE || window.API_BASE || '';

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
