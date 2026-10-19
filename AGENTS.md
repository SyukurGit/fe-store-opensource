# Digimest Frontend Architecture Guide (for Developers & AI Agents)

> **STATUS: LIVE PRODUCTION**  
> Sub-direktori `/web` ini adalah Frontend Jamstack mandiri yang berjalan secara live via Cloudflare Tunnel dan terhubung langsung ke Backend Golang Chi di VPS (`https://digimest.syukurapi.online`).

---

## 1. Peta Navigasi Cepat (Quick File Directory Map)

Gunakan tabel ini untuk langsung menuju ke file yang tepat tanpa perlu membuang token membaca file raksasa:

| Fitur / Kebutuhan | File yang Harus Dibuka | Objek / Fungsi Utama |
| :--- | :--- | :--- |
| **API Base & Config Global** | [`js/api-config.js`](file:///C:/laragon/www/storeku/web/js/api-config.js) | `window.digimestApi(endpoint)`, `window.DIGIMEST_API_BASE`, version watcher |
| **Utilitas Umum (Format/Toast/XSS)** | [`js/utils.js`](file:///C:/laragon/www/storeku/web/js/utils.js) | `window.DigimestUtils` (`formatCurrency`, `escapeHtml`, `showToast`, `copyText`) |
| **Engine Mata Uang (IDR & USD)** | [`js/currency.js`](file:///C:/laragon/www/storeku/web/js/currency.js) | `window.DigimestCurrency` (`getCurrency`, `setCurrency`, `format`, `syncUI`) |
| **Drawer Mobile & Switcher Bahasa** | [`js/nav-mobile.js`](file:///C:/laragon/www/storeku/web/js/nav-mobile.js) | `window.DigimestNav` (`openDrawer`, `closeDrawer`), `#navHamburgerBtn`, `[data-lang]` |
| **Riwayat Pesanan LocalStorage** | [`js/order-history.js`](file:///C:/laragon/www/storeku/web/js/order-history.js) | `window.DigimestOrders` (`getOrders`, `saveOrder`, `updateStatus`, `renderHistoryList`) |
| **Katalog, Search, & Announcement** | [`js/app.js`](file:///C:/laragon/www/storeku/web/js/app.js) | `renderProducts()`, `applyFilterAndSearch()`, `initStoreAnnouncement()` |
| **Detail Produk & Checkout** | [`js/product.js`](file:///C:/laragon/www/storeku/web/js/product.js) | `initProductPage()`, `appliedVoucher`, multi-gateway selector, QRIS notice |
| **Halaman Pembayaran & Polling** | [`js/payment.js`](file:///C:/laragon/www/storeku/web/js/payment.js) | `pollOrderStatus()`, countdown timer, status UI (`PAID`, `PENDING`, `EXPIRED`) |
| **Klaim / Ambil Lisensi** | [`js/claim.js`](file:///C:/laragon/www/storeku/web/js/claim.js) | `doClaim()`, render serial/license credentials |
| **Admin Panel Controller** | [`js/admin.js`](file:///C:/laragon/www/storeku/web/js/admin.js) | Admin authentication, CRUD produk, pesanan, voucher, pengumuman toko |
| **Styling Utama Toko** | [`css/style.css`](file:///C:/laragon/www/storeku/web/css/style.css) | Dark theme (default), light theme overrides (`html[data-theme="light"]`) |
| **Styling Admin Panel** | [`css/admin.css`](file:///C:/laragon/www/storeku/web/css/admin.css) | Khusus admin (selalu Dark Mode) |

---

## 2. Arsitektur Multibahasa (ID & EN Mirroring)

Sistem menggunakan struktur file ganda untuk performa SEO statis maksimal:
- **Halaman Bahasa Indonesia**: Terletak di root (`index.html`, `product.html`, `payment.html`, `claim.html`, dst).
- **Halaman Bahasa Inggris**: Terletak di sub-folder `en/` (`en/index.html`, `en/product.html`, `en/payment.html`, `en/claim.html`, dst).

> [!WARNING]
> **Aturan Wajib Edit HTML**:
> Setiap kali Anda mengubah struktur elemen, ID, tombol, atau menambahkan script tag di halaman Bahasa Indonesia, Anda **WAJIB menyalin perubahan tersebut ke halaman pasangannya di folder `en/`** (atau sebaliknya). Jangan biarkan kedua versi mengalami drift!

---

## 3. Urutan Pemuatan Script yang Baku

Semua halaman toko memuat script dalam urutan dependency yang terstruktur:
1. `<head>`: [`/js/api-config.js?v=5.9.20`](file:///C:/laragon/www/storeku/web/js/api-config.js) (menjalankan early redirect tema & bahasa sebelum render).
2. `<body>` (sebelum tag penutup):
   - [`/js/utils.js?v=5.9.20`](file:///C:/laragon/www/storeku/web/js/utils.js)
   - [`/js/currency.js?v=5.9.20`](file:///C:/laragon/www/storeku/web/js/currency.js)
   - [`/js/nav-mobile.js?v=5.9.20`](file:///C:/laragon/www/storeku/web/js/nav-mobile.js)
   - [`/js/order-history.js?v=5.9.20`](file:///C:/laragon/www/storeku/web/js/order-history.js)
   - *[Script spesifik halaman: `app.js` / `product.js` / `payment.js` / `claim.js`]*

---

## 4. Aturan Kerja Mutlak (Zero Regression Guardrails)

1. **Kontrak API Backend Go**: Jangan pernah mengubah nama field JSON (`json:"..."`), tipe data response, atau path URL endpoint tanpa mengecek backend Go dan sebaliknya.
2. **Jaringan & Proxy**: DILARANG mengubah konfigurasi CORS, pengaturan Cookie/Session (`SameSite`, `Secure`, `Domain`), atau pembacaan proxy headers (`CF-Connecting-IP`, `X-Forwarded-For`).
3. **Verifikasi Wajib Sebelum Lapor Selesai**:
   - Jalankan `go build ./...` di root untuk memastikan 0 compile error.
   - Jalankan `node --check web/js/*.js` untuk memastikan 0 syntax error.
