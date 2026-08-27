# Sistem Kasir Digital POS

Aplikasi point of sale (POS) & manajemen kasir UMKM berbasis Google Apps Script — mencatat transaksi penjualan, mengelola stok produk dan pelanggan, mengatur shift operator, serta mencetak struk belanja dan laporan keuangan secara otomatis dari database Google Sheets.

## Tech Stack
- **Google Apps Script** (Backend RPC & Serverless API)
- **Google Sheets** (Database & Persistensi Data)
- **HTML5, CSS3, JavaScript ES6+** (Frontend Single Page Application)
- **Lucide Icons** (Visual Icon System)

## Screenshot

![Dashboard & Modul POS](<img width="1920" height="915" alt="pos3" src="https://github.com/user-attachments/assets/4864611d-d81a-4732-99cf-965390b3a928" />
)
![Manajemen Produk & Transaksi](<img width="1920" height="916" alt="image" src="https://github.com/user-attachments/assets/f493cffd-9453-447d-afaf-f9673864b718" />
)

## Cara Menjalankan

1. Clone repository ini ke komputer Anda atau unduh file source code (`Code.gs` dan `Index.html`).
2. Buka [Google Apps Script Editor](https://script.google.com) dan buat project baru.
3. Buat file script `Code.gs` lalu salin seluruh kode dari `Code.gs` di repository ini.
4. Buat file HTML `Index.html` lalu salin seluruh kode dari `Index.html` di repository ini.
5. Buat Google Sheets baru sebagai database, salin Sheet ID dari URL browser.
6. Masukkan Sheet ID ke dalam Script Properties (`Project Settings > Script Properties`) dengan key `SPREADSHEET_ID`.
7. Lakukan deployment sebagai Web App (**Deploy > New Deployment > Web App**).
   - *Execute as*: Me (email Anda)
   - *Who has access*: Anyone / Siapa saja
8. Akses URL Web App yang diberikan untuk mulai menggunakan aplikasi kasir.

## Demo Live

[Coba aplikasi di sini](https://script.google.com/macros/s/xxx/exec)

## Portofolio Lengkap

Lihat detail lengkap project ini, termasuk Jurnal Keputusan dan hasil penilaian industri di (Portofolio Edusoft) https://portfolio.edusoftcenter.com/contributors/junior-alfredo-benerd-setiawan
