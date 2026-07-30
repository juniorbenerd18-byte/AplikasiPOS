# Bugfix Requirements Document - 8 Bug Kritis Aplikasi Kasir

## Introduction

Aplikasi kasir Google Apps Script mengalami 8 bug kritis yang mempengaruhi integritas data, konsistensi sistem, dan user experience. Bug-bug ini meliputi:

1. **Settings Update Failure** - Settings gagal di-update karena penggunaan ID yang salah
2. **Duplicate Notifications** - Notifikasi stok menipis terus bertambah tanpa cek duplikasi
3. **Invoice Number Race Condition** - Potensi invoice number duplikat pada transaksi bersamaan
4. **Case-Insensitive Barcode Search** - Pencarian barcode tidak konsisten karena case sensitivity
5. **Missing Shift Validation** - Transaksi bisa dibuat tanpa shift aktif
6. **Negative Stock** - Stok produk bisa menjadi negatif tanpa validasi
7. **Cash Payment Validation** - Pembayaran tunai tidak divalidasi apakah cukup
8. **Tax Calculation Error** - Tax calculation bisa menghasilkan NaN atau error

Bug-bug ini dapat menyebabkan data corruption, inconsistency, dan user experience yang buruk. Prioritas: **High**.

---

## Bug Analysis

### Current Behavior (Defect)

**Bug #1: Settings Update Failure (Database.gs)**

1.1 WHEN `DB.setSetting(key, value)` dipanggil untuk update setting yang sudah ada THEN sistem memanggil `DB.update(CONFIG.SHEET_NAMES.SETTINGS, key, ...)` dengan `key` sebagai ID parameter, padahal seharusnya menggunakan `id` field dari record

1.2 WHEN setting dengan key tertentu sudah ada di database THEN update gagal karena `DB.update()` mencari row dengan `id = key` (yang tidak cocok dengan actual ID)

**Bug #2: Duplicate Notifications (Services.gs)**

1.3 WHEN produk stok mencapai atau di bawah threshold dalam `createTransaction()` THEN sistem selalu membuat notifikasi baru tanpa cek apakah notifikasi serupa (produk yang sama, type yang sama, unread) sudah ada

1.4 WHEN transaksi berulang untuk produk yang stoknya sudah menipis THEN notifikasi duplikat terus bertambah untuk produk yang sama

**Bug #3: Invoice Number Race Condition (Database.gs)**

1.5 WHEN `DB.generateInvoice()` dipanggil THEN sistem menggunakan `count = DB.getAll(TRANSACTIONS).length + 1` untuk generate sequential number

1.6 WHEN dua transaksi dibuat secara bersamaan (concurrent) THEN kedua transaksi bisa mendapat `count` yang sama, menghasilkan invoice number duplikat

**Bug #4: Case Sensitivity Filter Produk (Services.gs)**

1.7 WHEN `getProducts(filter)` dipanggil dengan barcode search THEN sistem menggunakan `String(p.barcode).includes(q)` tanpa `toLowerCase()` pada barcode

1.8 WHEN user search barcode dengan case berbeda THEN pencarian barcode tidak konsisten (nama dan SKU sudah case-insensitive, tapi barcode tidak)

**Bug #5: Missing Shift Validation (Services.gs)**

1.9 WHEN `createTransaction()` dipanggil THEN sistem tidak memvalidasi apakah `shiftId` yang diberikan valid atau apakah ada shift aktif

1.10 WHEN transaksi dibuat dengan `shiftId` kosong atau invalid THEN transaksi tetap berhasil dibuat tanpa error, meskipun seharusnya memerlukan shift aktif untuk tracking

**Bug #6: Negative Stock (Services.gs)**

1.11 WHEN `createTransaction()` mengurangi stok produk THEN sistem langsung mengurangi tanpa validasi apakah `qty` yang diminta melebihi stok tersedia

1.12 WHEN transaksi dibuat dengan qty lebih besar dari stok THEN stok menjadi negatif: `newStock = stock - qty` (misal: stock=5, qty=10, result=-5)

**Bug #7: Cash Payment Validation (Services.gs)**

1.13 WHEN `createTransaction()` dipanggil dengan `paymentMethod = 'tunai'` THEN sistem tidak memvalidasi apakah `cashPaid >= total`

1.14 WHEN pembayaran tunai dengan `cashPaid < total` THEN transaksi tetap berhasil dengan `change` negatif atau salah

**Bug #8: Tax Calculation Error (Services.gs)**

1.15 WHEN `createTransaction()` menghitung tax THEN sistem menggunakan `parseFloat(settings.taxRate)` yang bisa menghasilkan `NaN` jika `taxRate` bukan angka valid

1.16 WHEN `settings.taxRate` adalah `undefined`, string non-numeric, atau `null` THEN perhitungan `tax = Math.round(subtotal * taxRate / 100)` menghasilkan `NaN`, dan `total = subtotal + NaN` juga menjadi `NaN`

---

### Expected Behavior (Correct)

**Bug #1: Settings Update Failure**

2.1 WHEN `DB.setSetting(key, value)` dipanggil untuk update setting yang sudah ada THEN sistem SHALL mencari record berdasarkan `key` field, mengambil `id`-nya, lalu memanggil `DB.update()` dengan `id` yang benar

2.2 WHEN setting dengan key tertentu sudah ada THEN sistem SHALL berhasil meng-update value-nya

**Bug #2: Duplicate Notifications**

2.3 WHEN produk stok mencapai threshold dalam `createTransaction()` THEN sistem SHALL memeriksa apakah sudah ada notifikasi unread dengan type dan message yang sama untuk produk tersebut

2.4 WHEN notifikasi serupa sudah ada (unread) THEN sistem SHALL TIDAK membuat notifikasi baru, menjaga notifikasi tetap unik per produk per kondisi

**Bug #3: Invoice Number Race Condition**

2.5 WHEN `DB.generateInvoice()` dipanggil THEN sistem SHALL menggunakan mekanisme yang aman dari race condition, seperti timestamp dengan milliseconds dan random component

2.6 WHEN dua transaksi dibuat bersamaan THEN setiap transaksi SHALL mendapat invoice number yang unik dan berbeda

**Bug #4: Case Sensitivity Filter Produk**

2.7 WHEN `getProducts(filter)` melakukan barcode search THEN sistem SHALL menggunakan `String(p.barcode).toLowerCase().includes(q)` untuk konsistensi dengan pencarian nama dan SKU

2.8 WHEN user search barcode dengan case berbeda THEN hasil pencarian SHALL konsisten dan menemukan produk yang sesuai

**Bug #5: Missing Shift Validation**

2.9 WHEN `createTransaction()` dipanggil THEN sistem SHALL memvalidasi bahwa kasir memiliki shift aktif (status='open') yang valid

2.10 WHEN tidak ada shift aktif untuk kasir THEN sistem SHALL return error `{ success: false, message: 'Tidak ada shift aktif...' }` dan tidak membuat transaksi

**Bug #6: Negative Stock**

2.11 WHEN `createTransaction()` akan mengurangi stok THEN sistem SHALL memvalidasi untuk setiap item bahwa `product.stock >= item.qty`

2.12 WHEN qty melebihi stok tersedia THEN sistem SHALL return error `{ success: false, message: 'Stok [product_name] tidak cukup...' }` dan tidak membuat transaksi, mencegah stok negatif

**Bug #7: Cash Payment Validation**

2.13 WHEN `createTransaction()` dipanggil dengan `paymentMethod = 'tunai'` THEN sistem SHALL memvalidasi bahwa `cashPaid >= total`

2.14 WHEN `cashPaid < total` untuk payment tunai THEN sistem SHALL return error `{ success: false, message: 'Pembayaran tunai tidak cukup...' }` dan tidak membuat transaksi

**Bug #8: Tax Calculation Error**

2.15 WHEN `createTransaction()` menghitung tax THEN sistem SHALL menggunakan `parseFloat(settings.taxRate) || 0` dengan fallback ke 0 untuk handle invalid value

2.16 WHEN `settings.taxRate` invalid atau tidak ada THEN tax SHALL menjadi 0 (zero), dan total tetap valid tanpa `NaN`

---

### Unchanged Behavior (Regression Prevention)

**Preserved Behaviors - Settings**

3.1 WHEN `DB.setSetting(key, value)` dipanggil untuk key yang belum ada THEN sistem SHALL CONTINUE TO membuat record baru dengan `insert()` seperti sebelumnya

3.2 WHEN `DB.getSetting(key)` atau `DB.getAllSettings()` dipanggil THEN sistem SHALL CONTINUE TO return nilai yang benar tanpa perubahan behavior

**Preserved Behaviors - Notifications**

3.3 WHEN notifikasi dibuat untuk kondisi lain (bukan stok menipis/habis) THEN sistem SHALL CONTINUE TO membuat notifikasi seperti biasa

3.4 WHEN user membaca, menghapus, atau mark notifikasi THEN fungsi `markNotifRead()`, `deleteNotif()`, `markAllNotifsRead()` SHALL CONTINUE TO bekerja normal

**Preserved Behaviors - Transactions**

3.5 WHEN transaksi dibuat dengan payment method 'qris' atau 'debit' THEN sistem SHALL CONTINUE TO tidak memerlukan validasi `cashPaid` (karena payment digital tidak ada cash/change)

3.6 WHEN transaksi dibuat dengan `includeTax = false` THEN sistem SHALL CONTINUE TO set tax=0 tanpa error

3.7 WHEN transaksi berhasil dibuat THEN sistem SHALL CONTINUE TO update customer totalSpend, shift totalSales, dan insert transaction_items seperti sebelumnya

3.8 WHEN stok produk cukup untuk qty yang diminta THEN sistem SHALL CONTINUE TO mengurangi stok dan membuat transaksi dengan normal

**Preserved Behaviors - Invoice Generation**

3.9 WHEN invoice number di-generate THEN format `INV-YYYYMMDD-XXXX` SHALL CONTINUE TO digunakan (hanya mechanism internal yang berubah untuk prevent race condition)

**Preserved Behaviors - Products**

3.10 WHEN pencarian produk menggunakan nama atau SKU THEN behavior case-insensitive yang sudah ada SHALL CONTINUE TO bekerja normal

3.11 WHEN produk di-save, delete, atau diambil by barcode exact match THEN fungsi lain SHALL CONTINUE TO bekerja tanpa perubahan

**Preserved Behaviors - Shifts**

3.12 WHEN shift di-open atau close THEN fungsi `openShift()`, `closeShift()`, `getActiveShift()`, `getShifts()` SHALL CONTINUE TO bekerja normal

3.13 WHEN shift aktif valid digunakan dalam transaksi THEN shift totalSales dan txCount SHALL CONTINUE TO di-update dengan benar
