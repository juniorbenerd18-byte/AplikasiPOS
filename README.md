# 🛒 Aplikasi Kasir (Point of Sale)

> Sistem Point of Sale (POS) berbasis web yang dibangun menggunakan **Google Apps Script** dan **HTML Service** untuk membantu proses transaksi penjualan, pengelolaan produk, pelanggan, serta penyusunan laporan penjualan secara efisien.

![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=for-the-badge\&logo=google\&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge\&logo=html5\&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge\&logo=javascript\&logoColor=black)
![Status](https://img.shields.io/badge/Status-Dalam%20Pengembangan-success?style=for-the-badge)

---

# 📖 Tentang Proyek

Aplikasi Kasir (Point of Sale) merupakan aplikasi berbasis web yang dikembangkan menggunakan **Google Apps Script** sebagai backend dan **HTML Service** sebagai frontend.

Aplikasi ini dirancang untuk mempermudah proses operasional toko, mulai dari transaksi penjualan, pengelolaan produk, manajemen pelanggan, pengelolaan shift kasir, hingga penyajian laporan penjualan dalam satu sistem yang terintegrasi.

Dengan memanfaatkan layanan Google Apps Script, aplikasi dapat dijalankan sebagai **Web App** tanpa memerlukan server khusus sehingga proses deployment menjadi lebih mudah, cepat, dan hemat biaya.

---

# ✨ Fitur Utama

## 🔐 Autentikasi Pengguna

* Login Pengguna
* Manajemen Session
* Remember Me
* Lupa Password
* Hak Akses Berdasarkan Role
* Admin & Kasir

---

## 📊 Dashboard

Dashboard menyediakan informasi penting mengenai kondisi toko secara real-time, seperti:

* Ringkasan Penjualan Hari Ini
* Total Transaksi
* Total Produk Terjual
* Monitoring Stok Produk
* Grafik Penjualan
* Produk Terlaris
* Aktivitas Terbaru

---

## 🛍 Transaksi Kasir (POS)

Fitur utama untuk melakukan transaksi penjualan.

### Tersedia Fitur

* Pencarian Produk
* Filter Kategori
* Keranjang Belanja
* Pengaturan Jumlah Produk
* Diskon
* Perhitungan Pajak Otomatis
* Catatan Produk
* Pemilihan Pelanggan
* Perhitungan Total Otomatis
* Cetak Struk

---

## 📦 Manajemen Produk

Mengelola seluruh data produk yang tersedia.

Fitur:

* Tambah Produk
* Edit Produk
* Hapus Produk
* Upload Foto Produk
* Kategori Produk
* SKU Produk
* Harga Modal
* Harga Jual
* Manajemen Stok

---

## 👥 Manajemen Pelanggan

Mengelola data pelanggan dan member.

Fitur:

* Data Pelanggan
* Riwayat Pembelian
* Informasi Member

---

## 💳 Riwayat Transaksi

Menyimpan seluruh histori transaksi.

Fitur:

* Daftar Transaksi
* Detail Invoice
* Pencarian Invoice
* Filter Data
* Cetak Ulang Struk

---

## ⏰ Manajemen Shift

Digunakan untuk mengelola aktivitas kasir berdasarkan shift kerja.

Fitur:

* Buka Shift
* Tutup Shift
* Modal Awal
* Saldo Akhir
* Ringkasan Shift
* Riwayat Shift

---

## 📈 Laporan Penjualan

Menyediakan laporan penjualan sebagai bahan evaluasi bisnis.

Jenis Laporan:

* Penjualan Harian
* Penjualan Bulanan
* Pendapatan
* Produk Terlaris
* Riwayat Penjualan

---

## 🔔 Sistem Notifikasi

Memberikan informasi penting kepada pengguna.

Meliputi:

* Notifikasi Stok Menipis
* Informasi Sistem
* Peringatan
* Tandai Dibaca
* Hapus Notifikasi

---

## ⚙ Pengaturan

Mengatur konfigurasi aplikasi.

Meliputi:

* Informasi Toko
* Pajak
* Mata Uang
* Footer Struk
* Pengaturan Pengguna

---

# 🛠 Teknologi yang Digunakan

## Frontend

* HTML5
* CSS3
* JavaScript (Vanilla JS)

## Backend

* Google Apps Script (GAS)

## Basis Data

* Google Spreadsheet

## Library

* Chart.js
* Lucide Icons
* Google Apps Script HTML Service

---

# 📂 Struktur Proyek

```text
Aplikasi-Kasir/
│
├── Code.gs
│   │
│   ├── Autentikasi Pengguna
│   ├── Manajemen Session
│   ├── API Backend
│   ├── CRUD Produk
│   ├── CRUD Pelanggan
│   ├── Proses Transaksi
│   ├── Manajemen Shift
│   ├── Pembuatan Laporan
│   ├── Sistem Notifikasi
│   └── Fungsi Pendukung
│
├── Index.html
│   │
│   ├── Struktur HTML
│   ├── CSS (Tampilan)
│   ├── JavaScript (Frontend)
│   ├── Halaman Login
│   ├── Dashboard
│   ├── Halaman POS
│   ├── Manajemen Produk
│   ├── Manajemen Pelanggan
│   ├── Halaman Laporan
│   ├── Sistem Notifikasi
│   ├── Komponen Modal
│   └── Tampilan Responsif
│
├── appsscript.json
│
└── README.md
```

---

# 🗄 Struktur Basis Data

Aplikasi menggunakan **Google Spreadsheet** sebagai media penyimpanan data.

Contoh struktur sheet:

```text
Users
Products
Categories
Customers
Transactions
Transaction_Details
Shifts
Notifications
Settings
Logs
```

---

# 🚀 Cara Menjalankan

1. Clone repository ini.

```bash
git clone https://github.com/username/aplikasi-kasir.git
```

2. Buat project baru di **Google Apps Script**.

3. Upload file:

* Code.gs
* Index.html
* appsscript.json

4. Hubungkan project dengan Google Spreadsheet.

5. Deploy sebagai **Web App**.

6. Berikan izin akses yang diperlukan.

7. Jalankan aplikasi melalui URL Web App yang telah dibuat.

---

# 👤 Hak Akses Pengguna

## Administrator

Administrator memiliki akses penuh terhadap seluruh sistem.

Hak akses:

* Dashboard
* Transaksi
* Produk
* Pelanggan
* Shift
* Laporan
* Pengaturan
* Manajemen Pengguna

---

## Kasir

Kasir hanya memiliki akses operasional.

Hak akses:

* Login
* Dashboard
* Transaksi
* Pelanggan
* Riwayat Transaksi
* Shift

---

# 🎯 Tujuan Pengembangan

Aplikasi ini dikembangkan untuk:

* Mempermudah proses transaksi penjualan.
* Mengelola stok produk secara lebih efektif.
* Menyediakan laporan penjualan yang informatif.
* Memantau aktivitas kasir.
* Meningkatkan efisiensi operasional toko.
* Mengurangi kesalahan pencatatan transaksi.

---

# 🔮 Pengembangan Selanjutnya

Fitur yang direncanakan:

* Scan Barcode
* Pembayaran QRIS
* Kirim Struk WhatsApp
* Multi Cabang
* Manajemen Supplier
* Manajemen Pembelian
* Export PDF
* Export Excel
* Dashboard Analitik yang Lebih Lengkap
* Optimasi Tampilan Mobile

---

# 👨‍💻 Pengembang

**Junior Alfredo Benerd Setiawan**

SMK Negeri 6 Surakarta

Program Keahlian Rekayasa Perangkat Lunak (RPL)

---

# 📄 Lisensi

Proyek ini dibuat sebagai media pembelajaran, pengembangan portofolio, dan implementasi aplikasi Point of Sale berbasis Google Apps Script.

---

⭐ Jika proyek ini bermanfaat, jangan lupa berikan **Star** pada repository GitHub.
