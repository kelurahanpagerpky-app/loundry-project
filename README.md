# MHC-Laundry — Sistem Manajemen Laundry

Website manajemen laundry yang siap di-hosting di **GitHub Pages**. Aplikasi ini murni
front-end (HTML, CSS, JavaScript) dan menyimpan semua data di `localStorage` browser,
jadi tidak butuh server atau database — cukup upload ke GitHub dan aktifkan Pages.

## Apa yang sudah diperbaiki dari file asli

File yang diunggah (`stitch_MHC-Laundry_management_system.zip`) berisi ±30 halaman hasil
desain (Google Stitch) yang murni **mockup statis**: tombol, form, dan navigasinya belum
tersambung ke logika apa pun (semua link `href="#"`, form tidak submit ke mana pun, tidak
ada penyimpanan data). Proyek ini merapikan seluruh desain menjadi **satu aplikasi yang
benar-benar berfungsi**:

- Digabung dari ±30 varian halaman menjadi 8 halaman inti yang saling terhubung nyata.
- Header palsu "This application was created by a Google Apps Script user" dihapus.
- Login sungguhan (validasi username/password) + mode demo.
- Semua data (pesanan, pelanggan, layanan, pengaturan) tersimpan otomatis di `localStorage`
  lewat `assets/js/db.js`, lengkap dengan data contoh awal.
- Sidebar & topbar dirender sekali lewat `assets/js/layout.js` supaya konsisten dan tidak
  ada link mati di semua halaman.
- CRUD penuh untuk Pesanan, Pelanggan, dan Layanan (tambah/ubah/hapus, validasi input).
- Pencarian & filter (status, pembayaran, tanggal) yang benar-benar memfilter data.
- Cetak struk (`struk.html`) yang mengambil data pesanan asli dan siap `Ctrl+P`.
- Laporan keuangan dengan grafik (Chart.js), filter rentang tanggal, dan ekspor CSV.
- Ekspor/impor cadangan data (JSON) serta tombol reset ke data contoh di halaman Pengaturan.
- **Baru:** opsi menyambungkan database ke **Google Sheets** lewat Google Apps Script
  (backend siap pakai di `apps-script/Code.gs`), lengkap dengan uji koneksi, indikator
  status "Tersambung/Mode Lokal" di sidebar, dan fallback otomatis ke data cadangan lokal
  bila koneksi terputus.

## Struktur folder

```
├── index.html          # Halaman login
├── dashboard.html       # Ringkasan: statistik, grafik, pesanan terbaru
├── pesanan.html          # Manajemen pesanan (CRUD, filter, cetak struk)
├── pelanggan.html        # Manajemen pelanggan & loyalitas
├── layanan.html          # Katalog layanan & harga
├── laporan.html          # Laporan keuangan & ekspor CSV
├── pengaturan.html       # Profil usaha, koneksi Google Sheets, backup data
├── struk.html            # Struk/invoice siap cetak
├── apps-script/
│   └── Code.gs            # Backend Google Apps Script (database = Google Sheets)
└── assets/
    ├── css/style.css
    └── js/
        ├── db.js          # Lapisan data async (mode lokal / Google Sheets) + data contoh
        └── layout.js      # Sidebar/topbar bersama + notifikasi toast + status koneksi
```

## Login demo

- Username: `admin`
- Password: `admin123`
- Atau klik **"Masuk Mode Demo"** untuk masuk tanpa kredensial.

> Ini adalah autentikasi sisi klien untuk keperluan demo/prototipe. Karena situs statis
> tidak punya server, jangan gunakan pola ini untuk data sungguhan yang sensitif — untuk
> produksi, sambungkan ke backend/API otentikasi sungguhan.

## Menghubungkan ke Google Sheets (opsional, database terpusat)

Secara default aplikasi berjalan di **Mode Lokal**: data tersimpan di `localStorage`
browser saja (cocok untuk demo/uji coba, tapi hanya terlihat di satu perangkat/browser).
Untuk database yang terpusat dan bisa diakses banyak perangkat, sambungkan ke Google
Spreadsheet lewat Google Apps Script — kode backend-nya sudah disiapkan di folder
`apps-script/Code.gs`.

**Langkah setup:**

1. Buka [sheets.google.com](https://sheets.google.com) → buat spreadsheet baru, beri nama
   misalnya "MHC-Laundry DB".
2. Menu **Extensions/Ekstensi → Apps Script**.
3. Hapus isi `Code.gs` bawaan, salin-tempel seluruh isi file `apps-script/Code.gs` dari
   proyek ini.
4. Ganti baris `var API_KEY = 'ganti-dengan-kata-sandi-rahasiamu';` dengan kata sandi
   rahasia buatanmu sendiri (bebas, contoh: `laundry-rahasia-2026`).
5. Di dropdown fungsi (bagian atas editor), pilih **setupSheets**, lalu klik **Run (▶)**.
   - Saat pertama kali dijalankan, Google akan meminta izin akses ke spreadsheet —
     klik **Review permissions** → pilih akun Google-mu → **Advanced/Lanjutan** →
     **Go to project (unsafe)** → **Allow**. Ini normal karena kode ini milikmu sendiri
     dan hanya berjalan di akunmu.
   - Setelah selesai, sheet `Pelanggan`, `Layanan`, `Pesanan`, dan `Pengaturan` akan
     otomatis terbuat lengkap dengan data contoh.
6. Klik **Deploy → New deployment**.
   - Pilih tipe **Web app**.
   - **Execute as**: Me (akunmu).
   - **Who has access**: Anyone.
   - Klik **Deploy**, lalu salin **Web app URL** yang muncul (bentuknya seperti
     `https://script.google.com/macros/s/XXXXXXXXXXXXX/exec`).
7. Buka aplikasi MHC-Laundry → menu **Pengaturan → Koneksi Google Sheets** → tempel
   Web App URL dan API Key (harus sama persis dengan yang di `Code.gs`) → klik
   **Tes Koneksi**, lalu **Sambungkan & Gunakan Google Sheets**.

Setelah tersambung, semua pesanan/pelanggan/layanan baru langsung tersimpan sebagai baris
di spreadsheet tersebut, dan bisa dibuka/diedit manual di Google Sheets kapan pun. Kalau
koneksi terputus (mis. tidak ada internet), aplikasi otomatis menampilkan data cadangan
lokal terakhir supaya tetap bisa dilihat.

> **Setiap kali kode `Code.gs` diedit**, kamu perlu membuat deployment baru: Deploy →
> Manage deployments → ikon pensil pada deployment aktif → Version: "New version" → Deploy.
> URL Web App tidak berubah, tapi perubahan kode baru aktif setelah versi baru di-deploy.

## Cara hosting ke GitHub Pages

1. Buat repository baru di GitHub (misalnya `MHC-Laundry`).
2. Upload seluruh isi folder ini ke repository (pastikan `index.html` ada di **root**
   repo, bukan di dalam subfolder).
   ```bash
   git init
   git add .
   git commit -m "Initial commit: MHC-Laundry app"
   git branch -M main
   git remote add origin https://github.com/USERNAME/MHC-Laundry.git
   git push -u origin main
   ```
3. Di GitHub, buka **Settings → Pages**.
4. Pada **Source**, pilih branch `main` dan folder `/ (root)`, lalu klik **Save**.
5. Tunggu 1–2 menit, situs akan aktif di:
   `https://USERNAME.github.io/MHC-Laundry/`

Tidak perlu proses build apa pun — semua library (Tailwind CSS, Chart.js, Google Fonts)
dimuat lewat CDN saat halaman dibuka.

## Catatan penting

- Data tersimpan **per-browser/per-perangkat** (localStorage), bukan di cloud. Gunakan
  tombol **Ekspor Cadangan (JSON)** di halaman Pengaturan secara berkala, terutama sebelum
  membersihkan cache browser.
- Untuk penggunaan bisnis nyata (multi-pengguna, data tersentralisasi), aplikasi ini perlu
  disambungkan ke backend (mis. Google Sheets/Apps Script, Firebase, atau REST API sendiri)
  menggantikan `assets/js/db.js`.
