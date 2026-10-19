# Digimest Frontend Architecture & Micro-Selector Guide (for Developers & AI Agents)

> **STATUS: LIVE PRODUCTION**  
> Sub-direktori `/web` ini adalah Frontend Jamstack mandiri (Pure HTML5, Vanilla JavaScript ES6+, dan CSS3 Modern tanpa bundler/tanpa framework) yang berjalan live via Cloudflare Tunnel dan terhubung langsung ke Backend Golang Chi.  
> Dokumen ini memetakan seluruh file HTML, modul JavaScript global, struktur data LocalStorage, serta **indeks mikro-selektor CSS baris-per-baris** dari `web/css/style.css` (8.447 baris).

---

## 1. Peta Navigasi Cepat (Quick File Directory Map)

Gunakan tabel ini untuk langsung menuju file yang tepat tanpa perlu membuang token membaca seluruh kode:

| Fitur / Kebutuhan | File yang Harus Dibuka | Objek / Fungsi Utama |
| :--- | :--- | :--- |
| **API Base & Config Global** | [`js/api-config.js`](file:///C:/laragon/www/storeku/web/js/api-config.js) | `window.digimestApi(endpoint, opts)`, `window.DIGIMEST_API_BASE`, version watcher |
| **Utilitas Umum (Format/Toast/XSS)** | [`js/utils.js`](file:///C:/laragon/www/storeku/web/js/utils.js) | `window.DigimestUtils` (`formatCurrency`, `escapeHtml`, `showToast`, `copyText`) |
| **Engine Mata Uang (IDR & USD)** | [`js/currency.js`](file:///C:/laragon/www/storeku/web/js/currency.js) | `window.DigimestCurrency` (`getCurrency`, `setCurrency`, `format`, `syncUI`, `convertIDRToUSD`) |
| **Drawer Mobile & Switcher Bahasa** | [`js/nav-mobile.js`](file:///C:/laragon/www/storeku/web/js/nav-mobile.js) | `window.DigimestNav` (`openDrawer`, `closeDrawer`), `#navHamburgerBtn`, `[data-lang]` |
| **Riwayat Pesanan LocalStorage** | [`js/order-history.js`](file:///C:/laragon/www/storeku/web/js/order-history.js) | `window.DigimestOrders` (`getOrders`, `saveOrder`, `updateStatus`, `renderHistoryList`) |
| **Katalog, Search, & Announcement** | [`js/app.js`](file:///C:/laragon/www/storeku/web/js/app.js) | `renderProducts()`, `applyFilterAndSearch()`, `initStoreAnnouncement()` |
| **Detail Produk & Checkout Modal** | [`js/product.js`](file:///C:/laragon/www/storeku/web/js/product.js) | `initProductPage()`, `appliedVoucher`, Tri-Zone Checkout Modal, Gateway Selector |
| **Halaman Pembayaran & Polling** | [`js/payment.js`](file:///C:/laragon/www/storeku/web/js/payment.js) | `pollOrderStatus()`, countdown timer, QRIS download, `#successView` 2-column renderer |
| **Klaim / Ambil Lisensi** | [`js/claim.js`](file:///C:/laragon/www/storeku/web/js/claim.js) | `doClaim()`, render serial/license credentials, QR claim lookup |
| **Admin Panel Controller** | [`js/admin.js`](file:///C:/laragon/www/storeku/web/js/admin.js) | Admin authentication, CRUD produk, pesanan, voucher, review, banner pop-up |
| **Styling Utama Toko (8.447 Baris)**| [`css/style.css`](file:///C:/laragon/www/storeku/web/css/style.css) | Dark theme (default), light theme (`html[data-theme="light"]`), responsive media queries |
| **Styling Admin Panel** | [`css/admin.css`](file:///C:/laragon/www/storeku/web/css/admin.css) | Khusus halaman admin (Dark Theme profesional) |

---

## 2. Arsitektur Multibahasa Statis (ID & EN Mirroring)

Sistem menggunakan **Dual-Folder Static Routing** untuk performa SEO tanpa overhead hydration:
- **Halaman Bahasa Indonesia (Default)**: Terletak di root folder `/web/`:
  - [`index.html`](file:///C:/laragon/www/storeku/web/index.html) — Etalase katalog produk, search, hero carousel
  - [`product.html`](file:///C:/laragon/www/storeku/web/product.html) — Detail spesifikasi produk, garansi, review, dan modal checkout
  - [`payment.html`](file:///C:/laragon/www/storeku/web/payment.html) — Kasir pembayaran multi-metode (QRIS, USDT BEP20, Binance Pay) & tampilan sukses 2-kolom
  - [`claim.html`](file:///C:/laragon/www/storeku/web/claim.html) — Halaman klaim lisensi menggunakan invoice atau kode klaim
  - [`order-history.html`](file:///C:/laragon/www/storeku/web/order-history.html) — Riwayat pesanan pembeli tersimpan lokal
  - Halaman Informasi & Legal: [`about.html`](file:///C:/laragon/www/storeku/web/about.html), [`how-to-buy.html`](file:///C:/laragon/www/storeku/web/how-to-buy.html), [`warranty.html`](file:///C:/laragon/www/storeku/web/warranty.html), [`privacy.html`](file:///C:/laragon/www/storeku/web/privacy.html), [`terms.html`](file:///C:/laragon/www/storeku/web/terms.html)
- **Halaman Bahasa Inggris (EN)**: Terletak di folder `/web/en/`:
  - [`en/index.html`](file:///C:/laragon/www/storeku/web/en/index.html)
  - [`en/product.html`](file:///C:/laragon/www/storeku/web/en/product.html)
  - [`en/payment.html`](file:///C:/laragon/www/storeku/web/en/payment.html)
  - [`en/claim.html`](file:///C:/laragon/www/storeku/web/en/claim.html)
  - [`en/order-history.html`](file:///C:/laragon/www/storeku/web/en/order-history.html)
  - [`en/about.html`](file:///C:/laragon/www/storeku/web/en/about.html), [`en/how-to-buy.html`](file:///C:/laragon/www/storeku/web/en/how-to-buy.html), [`en/warranty.html`](file:///C:/laragon/www/storeku/web/en/warranty.html), [`en/privacy.html`](file:///C:/laragon/www/storeku/web/en/privacy.html), [`en/terms.html`](file:///C:/laragon/www/storeku/web/en/terms.html)

> [!WARNING]
> **Aturan Wajib Edit HTML**:
> Setiap kali Anda mengubah struktur elemen, tag script, atribut ID, atau kelas CSS pada halaman Bahasa Indonesia, Anda **WAJIB menyalin perubahan tersebut ke file pasangannya di folder `en/`**. Keduanya harus memiliki DOM tree yang identik agar modul JavaScript dapat berjalan tanpa null error!

---

## 3. Urutan Pemuatan Script (Dependency Chain)

Semua halaman toko memuat script dalam urutan baku sebelum tag penutup `</body>`:
```html
<!-- 1. HEAD (Early init tema & backend host) -->
<script src="/js/api-config.js?v=5.9.20"></script>

<!-- 2. BODY END (Urutan modul fungsional) -->
<script src="/js/utils.js?v=5.9.20"></script>
<script src="/js/currency.js?v=5.9.20"></script>
<script src="/js/nav-mobile.js?v=5.9.20"></script>
<script src="/js/order-history.js?v=5.9.20"></script>

<!-- 3. SCRIPT SPESIFIK HALAMAN -->
<!-- Di index.html: -->   <script src="/js/app.js?v=5.9.20"></script>
<!-- Di product.html: --> <script src="/js/product.js?v=5.9.20"></script>
<!-- Di payment.html: --> <script src="/js/payment.js?v=5.9.20"></script>
<!-- Di claim.html: -->   <script src="/js/claim.js?v=5.9.20"></script>
```

---

## 4. Modul JavaScript & Kontrak Global Window

### A. `window.digimestApi(endpoint, options)` ([`web/js/api-config.js`](file:///C:/laragon/www/storeku/web/js/api-config.js))
- Wrapper fungsi `fetch` yang otomatis menunjuk ke host backend VPS (`https://digimest.syukurapi.online` atau localhost jika di mode dev lokal).
- Menyertakan header `Content-Type: application/json` default.
- Menangani global error dan version checking via polling periodic ke `/version.json`.

### B. `window.DigimestUtils` ([`web/js/utils.js`](file:///C:/laragon/www/storeku/web/js/utils.js))
- `formatCurrency(val, currency)`: Format angka ke Rupiah (`Rp 150.000`) atau Dollar (`$9.99`).
- `escapeHtml(str)`: Sanitasi string untuk mencegah celah XSS sebelum disisipkan ke `innerHTML`.
- `showToast(msg, type)`: Menampilkan notifikasi popup melayang di pojok layar (success/error/info).
- `copyText(text, btnElement)`: Menyalin string ke clipboard sistem dengan feedback visual sementara (centang hijau / teks "Disalin").

### C. `window.DigimestCurrency` ([`web/js/currency.js`](file:///C:/laragon/www/storeku/web/js/currency.js))
- Menyimpan state mata uang aktif di LocalStorage (`digimest_currency`: `'IDR'` atau `'USD'`).
- `getCurrency()` / `setCurrency('IDR'|'USD')`: Mengganti mata uang toko dan mentrigger render ulang harga.
- `convertIDRToUSD(idr)` / `convertUSDToIDR(usd)`: Menggunakan rate dinamis dari backend `/api/config`.
- `syncUI()`: Mengupdate indikator tombol switch mata uang di navbar dan drawer mobile.

### D. `window.DigimestNav` ([`web/js/nav-mobile.js`](file:///C:/laragon/www/storeku/web/js/nav-mobile.js))
- Mengontrol pembukaan/penutupan drawer navigasi mobile `#mobileDrawer`.
- Mengontrol switch tema Dark/Light (`digimest_theme`: `'dark'` atau `'light'`) yang disematkan pada tag `html[data-theme]`.
- Mengatur navigasi switcher bahasa ID/EN (`[data-lang="id"]`, `[data-lang="en"]`) dengan mendeteksi prefix path `/en/`.

### E. `window.DigimestOrders` ([`web/js/order-history.js`](file:///C:/laragon/www/storeku/web/js/order-history.js))
- Mengelola LocalStorage key `digimest_orders_history` (array transaksi pembeli pada browser ini).
- `saveOrder(order)`: Menyimpan invoice baru sesaat setelah checkout.
- `updateStatus(invoice, status)`: Memperbarui status pesanan dari polling.
- `renderHistoryList(containerId)`: Me-render daftar kartu riwayat pesanan dengan badge status warna.

---

## 5. Indeks Mikro-Selektor CSS Lengkap (`web/css/style.css` - 8.447 Baris)

Gunakan daftar baris spesifik ini untuk langsung melompat ke styling komponen terkecil:

### 1. Desain Token & CSS Custom Properties (Baris 1 - 42)
- `:root` (Baris 1 - 35):
  - `--bg-primary: #0a0b0e` (Warna canvas utama)
  - `--bg-secondary: #12141a` (Background bar & drawer)
  - `--bg-card: #181b22` (Background kartu produk dan modal)
  - `--bg-card-hover: #1f232c`
  - `--accent-primary: #3b82f6` (Biru aksen utama)
  - `--accent-hover: #2563eb`
  - `--accent-cyan: #06b6d4`
  - `--accent-green: #10b981` (Warna lunas / success)
  - `--accent-red: #ef4444` (Warna expired / cancel)
  - `--text-primary: #f8fafc`
  - `--text-secondary: #94a3b8`
  - `--text-muted: #64748b`
  - `--border-color: #242933`
  - `--border-focus: #3b82f6`
  - `--radius-sm: 6px`, `--radius-md: 10px`, `--radius-lg: 16px`
  - `--transition-fast: 0.15s ease`, `--transition-smooth: 0.25s ease`

### 2. Reset Global & Tipografi (Baris 43 - 150)
- `*`, `*::before`, `*::after`: Box sizing `border-box`, margin 0, padding 0.
- `body`: Font family `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto...`, background `--bg-primary`, color `--text-primary`.
- Container kelas pembatas: `.site-header`, `.container` (max-width: 1200px; padding: 0 1.25rem).

### 3. Navbar & Header Desktop (Baris 151 - 570)
- `.nav-container`: Flex bar horizontal, justify space-between.
- `.nav-logo`, `.nav-logo img`: Logo brand Digimest SVG/PNG.
- `.nav-links`: Menu horizontal desktop (`Home`, `Katalog`, `Riwayat Pesanan`, `Tentang`).
- `.nav-actions`: Tombol currency selector (`#currencyBtn`), switcher tema (`#themeToggleBtn`), switcher bahasa (`.lang-switcher`).

### 4. Hero Carousel & Showcase Banner (Baris 571 - 820)
- `.hero-section`: Container banner etalase utama toko.
- `.hero-carousel`: Slider transisi banner promo toko.
- `.carousel-slide`, `.carousel-slide.active`: State slide aktif dengan efek cross-fade.
- `.carousel-indicators`, `.indicator-dot`: Titik navigasi manual carousel.

### 5. Trust Badges & Partner Logos Bar (Baris 821 - 1067)
- `.trust-badges-bar`: Wrapper strip garansi dan jaminan keamanan transaksi.
- `.trust-item`: Kolom icon + teks jaminan (Garansi 100%, Pengiriman Instan, CS 24/7).
- `.payment-partners-bar`: Strip logo mitra perbankan & e-wallet resmi.

### 6. Katalog Produk, Search, & Kategori Filter (Baris 1068 - 1435)
- `.catalog-controls`: Bar pencarian produk dan tab filter kategori.
- `.search-box-wrapper`: Input pencarian dengan ikon kaca pembesar SVG.
- `.category-tabs`: Tab scrollable kategori produk (Semua, VPN, Streaming, AI Tools, Developer).
- `.category-btn`, `.category-btn.active`: Pill tab kategori yang terpilih.

### 7. Kartu Produk (Product Card Grid) (Baris 1436 - 1567)
- `.product-grid`: Grid responsif katalog (`grid-template-columns: repeat(auto-fill, minmax(260px, 1fr))`).
- `.prod-card`: Kartu produk individual dengan efek hover transform translateY(-3px).
- `.prod-thumb-wrapper`: Wadah gambar/logo produk dengan rasio aspek persegi.
- `.prod-logo`: Gambar brand produk (`object-fit: contain`).
- `.prod-badges`: Container badge diskon dan tipe lisensi di atas gambar.
- `.prod-badge-discount`: Pill merah diskon persentase promo (`-25%`).
- `.prod-title`: Judul nama produk (elipsis 2 baris).
- `.prod-price-box`: Wadah harga normal dan harga promo coret.
- `.prod-price-current`: Harga aktif yang dicetak tebal.
- `.prod-price-original`: Harga acuan yang dicoret (`text-decoration: line-through`).
- `.prod-stock-badge`: Indikator sisa stok (`Tersedia` / `Habis`).
- `.prod-btn-buy`: Tombol cepat "Beli Sekarang".

### 8. Halaman Pembayaran (Payment Page & Kasir) (Baris 1568 - 2145)
- `.payment-page-container` (Baris 1568 - 1584): Wrapper utama pembayaran, terpusat horizontal (`max-width: 960px`).
- **Compact Top Bar** (Baris 1585 - 1688):
  - `.payment-top-bar`: Baris tunggal informasi pesanan di desktop.
  - `.inv-tag`: Badge nomor invoice (`INV-XXXX`).
  - `.customer-email-tag`: Alamat email atau kontak pembeli.
  - `.countdown-box`: Timer mundur sisa waktu pembayaran (15 menit).
  - `.order-status-badge`: Status badge (`MENUNGGU PEMBAYARAN`, `LUNAS`, `KEDALUWARSA`).
- **Split 2-Column Grid** (Baris 1689 - 1804):
  - `.payment-grid-2col`: Grid 2-kolom desktop (`grid-template-columns: 310px 1fr; gap: 1.25rem`).
  - `.col-left`: Kolom kiri memuat QRIS barcode / snippet instruksi.
  - `.col-right`: Kolom kanan memuat rincian nominal, alamat wallet/pay ID, dan tombol aksi.
- **Product Quick Snippet** (Baris 1805 - 1836):
  - `.payment-product-snippet`: Kartu ringkasan produk yang dibeli.
  - `.snippet-icon`: Ikon/logo mini produk.
  - `.snippet-info`: Nama produk, varian, dan kuantitas.
- **Unified Payment Card (Nominal & Alamat dalam Satu Wadah)** (Baris 1837 - 1951):
  - `.unified-pay-card`: Card gelap terpadu menggabungkan nominal dan alamat tanpa pemisah grid yang berjauhan.
  - `.pay-detail-group`: Baris item pembayaran (Jumlah Transfer, Alamat Wallet, Binance Pay ID).
  - `.pay-nominal-box`: Kotak highlight nominal transfer presisi hingga 3 angka unik.
  - `.pay-address-box`: Kotak string alamat wallet kripto / Binance Pay ID.
  - `.qris-canvas-wrapper`: Wadah canvas QRIS resolusi tinggi (lebar optimal `195px`).
- **Interactive Copy Button** (Baris 1952 - 1982):
  - `.btn-copy-interactive`: Tombol salin interaktif dengan ikon SVG.
  - `.btn-copy-interactive.copied`: State setelah diklik (border hijau, icon checkmark).
- **Tombol Aksi Pembayaran** (Baris 1983 - 2090):
  - `.btn-download-qris`: Tombol unduh file gambar QRIS ke galeri HP / desktop.
  - `.btn-check-manual`: Tombol pemicu pengecekan status manual ke gateway.
  - `.btn-cancel-order`: Tombol batalkan pesanan.
- **Adaptasi Mobile Payment Page** (Baris 2091 - 2145):
  - `@media (max-width: 768px)`: `.payment-grid-2col` diubah menjadi layout kolom tunggal (stack) yang ergonomis dan tanpa overflow horizontal.

### 9. Halaman Sukses Pembayaran 2-Kolom Desktop (`#successView`) (Baris 2146 - 2350)
- `#successView`: Container view sukses setelah pembayaran diverifikasi lunas.
- `.success-2col-layout`: Grid desktop 2-kolom seimbang (`grid-template-columns: 1.15fr 0.85fr; gap: 1.25rem`). Mencegah layout memanjang ke bawah dan pas dalam satu layar desktop.
- **Kolom Kiri (Produk & Lisensi)**:
  - `.col-delivered-product`: Kolom utama tempat lisensi diserahkan kepada pembeli.
  - `.license-delivery-card`: Wadah kartu lisensi beraksen hijau sukses.
  - `.license-key-pre`: Blok monospace tempat serial key / kredensial akun ditampilkan jelas.
  - `.btn-copy-license`: Tombol salin serial lisensi satu klik.
  - `.license-pending-box`: Tampilan ramah bila produk memerlukan persiapan admin (menghilangkan kata-kata teknis "upstream/saldo bot", menggantinya dengan "🛡️ Lisensi Sedang Disiapkan Admin" dan "Dana 100% Aman").
  - `.btn-hubungi-cs-telegram`: Tombol chat otomatis ke Telegram CS dengan prefilled invoice.
- **Kolom Kanan (Meta Pesanan & Panduan)**:
  - `.col-order-meta`: Kolom rincian transaksi pembeli.
  - `.order-meta-card`: Kartu informasi invoice, tanggal transaksi, metode bayar.
  - `.reference-code-badge`: Badge kode klaim / referensi transaksi pembeli.

### 10. Tampilan Status Pembayaran Lainnya (Baris 2351 - 2430)
- `#pendingView`: View saat menunggu pelunasan.
- `#expiredView`: View saat timer 15 menit habis.
- `#cancelledView`: View saat pesanan dibatalkan.

### 11. Toast Notifications (Baris 2431 - 2453)
- `.toast-container`: Wadah fixed di kanan bawah layar (`z-index: 99999`).
- `.toast-message`: Pesan toast animasi slide-in dengan ikon checkmark/warning.

### 12. Halaman Detail Produk (`product.html`) (Baris 2454 - 2719)
- `.pdetail-layout`: Grid 2-kolom desktop detail produk (Kiri: Media/Logo & Garansi, Kanan: Judul, Spek, Harga & Tombol Beli).
- `.pdetail-media`: Container gambar logo produk resolusi tinggi.
- `.pdetail-summary`: Judul produk, rating bintang testimoni, dan badge garansi.
- `.pdetail-spec-table`: Tabel spesifikasi fitur lisensi, masa aktif, dan ketentuan pakai.
- `.pdetail-guarantee-list`: Daftar jaminan resmi dengan ikon vector SVG (Anti-Revoke, Fast Delivery, Full Support).

### 13. Mobile Floating Bottom Buy Bar (Baris 2720 - 2724 & 3014 - 3057)
- `.mobile-bottom-bar`: Bar mengambang (sticky bottom) khusus layar smartphone (`display: none` di desktop).
- `.mobile-bottom-price`: Menampilkan harga produk aktif di sebelah kiri bar.
- `.mobile-bottom-btn`: Tombol CTA beli sekarang di sebelah kanan bar dengan touch-height ergonomis (48px).

### 14. Mobile Catalog 2-Kolom Ergonomics (Baris 2725 - 3013)
- `@media (max-width: 640px)`:
  - `.product-grid`: Dipaksa tampil rapi **2 kotak per baris** (`grid-template-columns: repeat(2, 1fr); gap: 0.75rem`).
  - `.prod-card`: Pangkas teks deskripsi panjang menjadi 2 baris agar tinggi kartu sejajar.
  - `.prod-thumb-wrapper`: Rasio gambar disesuaikan agar proporsional pada layar HP kecil.

### 15. Tombol Floating CS Headset (Baris 3555 - 3617)
- `.floating-cs-button`: Tombol melayang di pojok kanan bawah halaman utama untuk bantuan Telegram.
- Proteksi halaman detail: Disembunyikan otomatis pada halaman detail produk agar tidak menutupi tombol sticky buy bar.

### 16. Halaman Informasi & Legal (About, How-To, Warranty, Terms) (Baris 3618 - 3787)
- `.info-page-wrapper`: Container membaca artikel legal dengan tipografi ramah mata.
- `.info-section-card`: Kartu bagian informasi dengan latar belakang `--bg-card`.
- `.info-callout`: Kotak highlight perhatian penting bagi pembeli.

### 17. Modal Riwayat Pesanan (`#orderHistoryModal`) (Baris 3788 - 4054)
- `.history-list`: Daftar pesanan lokal pengguna.
- `.history-card`: Kartu pesanan individual dengan ringkasan status dan tanggal checkout.
- `.history-status-chip`: Chip warna status (`PENDING` kuning, `PAID` hijau, `EXPIRED` merah).

### 18. Modul Testimoni & Ulasan Pembeli (Baris 4211 - 4450)
- `.reviews-container`: Container daftar review pembeli pada halaman detail produk.
- `.review-card`: Kartu testimoni individual.
- `.review-stars`: Bintang rating emas SVG (`★ ★ ★ ★ ★`).
- `.review-author-verified`: Lencana centang pembeli terverifikasi (*Verified Purchase*).

### 19. Tri-Zone Checkout Modal (Baris 4653 - 4977)
Arsitektur modal checkout modern yang membagi modal menjadi 3 zona fungsional:
- `body.modal-open`: Mengunci scroll background website saat modal aktif.
- `.tri-zone-modal`: Kartu modal desktop terpusat (`max-width: 520px; border-radius: 16px`).
- **Zone 1: Sticky Header** (Baris 4678 - 4720):
  - `.modal-zone-header`: Header modal yang selalu menempel di atas, memuat judul "Checkout Pesanan" dan tombol silang tutup (`.btn-modal-close`).
- **Zone 2: Scrollable Content Body** (Baris 4721 - 4910):
  - `.modal-zone-body`: Area body dengan overflow vertikal internal smooth scrolling.
  - `.integrated-prod-card`: Kartu rincian produk dan stepper jumlah barang (1, 2, 3...).
  - `.stepper-control`: Tombol minus/plus dan input kuantitas barang.
  - `.gateway-selector-trigger`: Baris seleksi metode pembayaran aktif (QRIS / USDT / Binance).
  - `.voucher-unified-card`: Input kupon diskon dan tombol "Terapkan".
  - `.checkout-summary-box`: Rincian harga dasar, diskon voucher, kode unik, dan total akhir.
  - `.checkout-trust-row`: Baris lencana keamanan dan jaminan transaksi.
- **Zone 3: Sticky Payment Footer** (Baris 4911 - 4977):
  - `.modal-zone-footer`: Footer modal yang selalu menempel di bawah.
  - `.btn-checkout-confirm`: Tombol primer "Lanjut ke Pembayaran" dengan loading spinner terpadu.

### 20. Tri-Zone Mobile Responsive & Bottom Sheet (Baris 4978 - 5705)
- `@media (max-width: 640px)`:
  - Transformasi modal desktop menjadi **Mobile Bottom Sheet** ergonomis menempel di dasar layar.
  - Zone 3 Footer dilengkapi `padding-bottom: env(safe-area-inset-bottom)` agar tidak terpotong home indicator iOS/Android.
  - Input field memiliki font-size minimal 16px untuk mencegah browser Safari/Chrome melakukan auto-zoom yang merusak layout.

### 21. Modal Pilihan Gateway Pembayaran (`#gatewayModal`) (Baris 5915 - 6114)
- `.gateway-grid`: Grid kartu opsi pembayaran.
- `.gateway-option-card`: Pilihan metode bayar (QRIS Otomatis, USDT BEP-20, Binance Pay C2C).
- `.gateway-badge-fast`: Lencana "Otomatis & Cepat" / "Bebas Biaya Admin".

### 22. Notice Modal Pengalihan Wilayah (Baris 6115 - 6156)
- `#regionNoticeModal`: Modal edukasi ramah pembeli Indonesia jika memilih opsi kripto USDT untuk menyarankan QRIS lokal.

### 23. Komprehensif Light Mode Overrides (Baris 6533 - 8132)
Aktif saat atribut `html[data-theme="light"]` disematkan:
- Token warna terang: Background menjadi `#f8fafc`, kartu menjadi `#ffffff`, border `#e2e8f0`, teks utama `#0f172a`, teks sekunder `#475569`.
- Navbar & Drawer Light Mode (Baris 6562 - 6723)
- Hero Showcase & Search Bar Light Mode (Baris 6724 - 6842)
- Kartu Produk Katalog Light Mode (Baris 6843 - 6933)
- Halaman Detail Produk & Garansi Light Mode (Baris 6934 - 7102)
- Customer Reviews Light Mode (Baris 7103 - 7185)
- Tri-Zone Checkout Modal Light Mode (Baris 7289 - 7508)
- Payment Page, QRIS Scanner, & Success View Light Mode (Baris 7532 - 7681 & 8091 - 8102)
- Claim Page & Info Pages Light Mode (Baris 7682 - 7781)
- Footer & Floating CS Light Mode (Baris 7782 - 7842)

### 24. Modal Pengumuman Toko / Pop-up Banner (Baris 8133 - 8447)
- `#storeAnnouncementModal`: Pop-up modal pengumuman toko yang dapat diatur dari admin panel.
- `.announcement-banner-img`: Gambar banner proporsional aspect-ratio 16:10.
- `.announcement-btn-close`: Tombol bulat tutup di pojok kanan atas modal.
- `.announcement-actions`: Tombol aksi banner (misal "Lihat Promo Sekarang").
- Responsive `< 540px` & `< 330px`: Proteksi anti-melebar untuk smartphone layar sempit.

---

## 6. Format Data LocalStorage

Frontend menyimpan state client-side pada browser pengguna menggunakan LocalStorage berikut:

1. **`digimest_theme`**: String `'dark'` (default) atau `'light'`.
2. **`digimest_currency`**: String `'IDR'` (default) atau `'USD'`.
3. **`digimest_orders_history`**: Array of JSON objects:
   ```json
   [
     {
       "invoice": "INV-20261019-13A7BA",
       "product_slug": "claude-pro-1-month",
       "product_name": "Claude Pro 1 Month",
       "amount": 299000,
       "payment_method": "QRIS",
       "payment_status": "PAID",
       "claim_code": "CLM-98214",
       "created_at": "2026-10-19T13:00:00Z"
     }
   ]
   ```
4. **`digimest_admin_token`**: Token sesi login administrator untuk halaman `/admin/`.

---

## 7. Panduan Menambah / Mengubah Fitur Frontend

### A. Menambahkan Komponen Baru ke Halaman Tertentu
1. Tambahkan struktur HTML pada file Bahasa Indonesia (misal `payment.html`).
2. **Segera salin elemen yang sama ke file Bahasa Inggris** (`en/payment.html`) dengan menyesuaikan teks string-nya.
3. Tambahkan styling CSS baru di [`web/css/style.css`](file:///C:/laragon/www/storeku/web/css/style.css) pada seksi yang relevan.
4. Jangan lupa menambahkan styling Light Mode untuk komponen baru tersebut di bawah blok `html[data-theme="light"]` (sekitar baris 7860 - 8130).

### B. Menambahkan Metode Pembayaran Baru ke Checkout
1. Perbarui daftar tombol pilihan di `#gatewayModal` pada `product.html` dan `en/product.html`.
2. Di [`web/js/product.js`](file:///C:/laragon/www/storeku/web/js/product.js), tambahkan handling gateway baru di fungsi `selectPaymentGateway()`.
3. Di [`web/js/payment.js`](file:///C:/laragon/www/storeku/web/js/payment.js), tambahkan renderer kotak pembayaran baru di fungsi `renderPaymentDetails()`.

### C. Verifikasi Kualitas Wajib Sebelum Lapor
Jalankan pengecekan sintaksis JavaScript di PowerShell:
```powershell
Get-ChildItem web/js/*.js | ForEach-Object { node --check $_.FullName }
```
Pastikan seluruh file mengembalikan 0 syntax error!
