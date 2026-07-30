# 🛒 POS Web Application

> A modern web-based Point of Sale (POS) system built with **Google Apps Script** and **HTML Service**, designed to simplify sales transactions, inventory management, and business reporting through an intuitive interface.

![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=for-the-badge\&logo=google\&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge\&logo=html5\&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge\&logo=javascript\&logoColor=black)
![Status](https://img.shields.io/badge/Status-Development-success?style=for-the-badge)

---

# 📖 Overview

POS Web Application merupakan sistem kasir berbasis web yang dikembangkan menggunakan **Google Apps Script** sebagai backend dan **HTML Service** sebagai frontend.

Aplikasi ini dirancang untuk membantu proses operasional toko mulai dari transaksi penjualan, manajemen produk, pelanggan, laporan penjualan, hingga pengelolaan shift kasir dalam satu sistem yang terintegrasi.

Dengan memanfaatkan ekosistem Google, aplikasi dapat dijalankan sebagai **Google Apps Script Web App** tanpa memerlukan server tambahan sehingga proses deployment menjadi lebih sederhana, ringan, dan mudah dikelola.

---

# ✨ Key Features

## 🔐 Authentication

* Login System
* Session Management
* Remember Me
* Forgot Password
* Role-Based Access Control
* Admin & Cashier Permissions

---

## 📊 Dashboard

Dashboard menyediakan ringkasan informasi bisnis secara real-time, meliputi:

* Today's Revenue
* Today's Transactions
* Total Products Sold
* Low Stock Monitoring
* Sales Analytics
* Best Selling Products
* Recent Activities

---

## 🛍 Point of Sale (POS)

Fitur utama aplikasi untuk melakukan transaksi penjualan.

### Available Features

* Product Search
* Category Filter
* Shopping Cart
* Quantity Management
* Automatic Tax Calculation
* Discount Support
* Customer Selection
* Order Notes
* Automatic Total Calculation
* Receipt Printing

---

## 📦 Product Management

Mengelola seluruh data produk yang tersedia.

Features:

* Add Product
* Edit Product
* Delete Product
* Product Photo
* SKU Management
* Product Categories
* Stock Management
* Purchase Price
* Selling Price

---

## 👥 Customer Management

Mengelola seluruh data pelanggan.

Features:

* Customer Registration
* Customer Information
* Purchase History
* Membership Support

---

## 💳 Transaction Management

Mengelola seluruh riwayat transaksi.

Features:

* Transaction History
* Invoice Details
* Search Invoice
* Transaction Filter
* Reprint Receipt

---

## ⏰ Shift Management

Mengelola aktivitas kasir berdasarkan shift kerja.

Features:

* Open Shift
* Close Shift
* Initial Cash
* Final Cash
* Shift Summary
* Shift History

---

## 📈 Reports

Menyediakan laporan penjualan untuk kebutuhan analisis.

Reports Include:

* Daily Sales
* Monthly Sales
* Revenue Summary
* Product Sales Report
* Transaction Report

---

## 🔔 Notification System

Sistem notifikasi membantu pengguna mengetahui kondisi penting pada aplikasi.

Notifications:

* Low Stock Alert
* Warning Notification
* Information Notification
* Read Notification
* Delete Notification

---

## ⚙ Settings

Pengaturan aplikasi.

Configuration:

* Store Information
* Tax Configuration
* Currency
* Receipt Footer
* User Preferences

---

# 🛠 Technology Stack

## Frontend

* HTML5
* CSS3
* Vanilla JavaScript (ES6)

## Backend

* Google Apps Script

## Database

* Google Spreadsheet

## Libraries

* Chart.js
* Lucide Icons
* Google Apps Script HTML Service

---

# 📂 Project Structure

```text
POS-WebApp/
│
├── Code.gs
│   │
│   ├── Authentication
│   ├── Session Management
│   ├── API Functions
│   ├── Product Management
│   ├── Customer Management
│   ├── Transaction Processing
│   ├── Shift Management
│   ├── Report Generation
│   ├── Notification Handler
│   └── Utility Functions
│
├── Index.html
│   │
│   ├── HTML Layout
│   ├── CSS Styling
│   ├── JavaScript Logic
│   ├── Login Interface
│   ├── Dashboard
│   ├── POS Interface
│   ├── Product Module
│   ├── Customer Module
│   ├── Report Module
│   ├── Notification System
│   ├── Modal Components
│   └── Responsive UI
│
├── appsscript.json
│
└── README.md
```

---

# 🗂 Database Structure

Data aplikasi disimpan menggunakan **Google Spreadsheet** sebagai media penyimpanan utama.

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

# 🚀 Deployment

## Clone Repository

```bash
git clone https://github.com/yourusername/pos-webapp.git
```

---

## Google Apps Script

1. Create a new Google Apps Script project.
2. Upload `Code.gs`.
3. Upload `Index.html`.
4. Configure `appsscript.json`.
5. Connect the project to the Google Spreadsheet database.
6. Deploy as **Web App**.
7. Grant the required Google permissions.
8. Open the generated Web App URL.

---

# 👤 User Roles

## Administrator

Administrator memiliki akses penuh terhadap seluruh sistem.

Permissions:

* Dashboard
* POS
* Product Management
* Customer Management
* Transaction Management
* Reports
* User Management
* Settings
* Shift Management

---

## Cashier

Kasir hanya memiliki akses terhadap fitur operasional.

Permissions:

* Login
* POS
* Customer
* Transaction History
* Shift

---

# 🎯 Project Goals

Tujuan utama pengembangan aplikasi ini adalah:

* Digitalisasi proses transaksi penjualan.
* Mempermudah pengelolaan stok produk.
* Memantau performa penjualan secara real-time.
* Menyediakan laporan bisnis yang informatif.
* Meningkatkan efisiensi operasional toko.

---

# 🔮 Future Improvements

Planned features:

* QR Code Scanner
* Barcode Scanner
* QRIS Payment Integration
* WhatsApp Receipt
* Multi Store Support
* Supplier Management
* Purchase Management
* Inventory Adjustment
* Advanced Analytics
* Export PDF
* Export Excel
* Mobile Optimization

---

# 📄 License

This project is intended for educational and portfolio purposes.

---

# 👨‍💻 Developer

**Junior Alfredo Benerd Setiawan**

SMK Negeri 6 Surakarta

Internship Program — Data Analyst & Web Development

---

⭐ If you find this project useful, consider giving it a **Star** on GitHub.
