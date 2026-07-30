# 8 Critical Bugs Bugfix Design

## Overview

Aplikasi kasir Google Apps Script memiliki 8 bug kritis yang mempengaruhi integritas data, konsistensi sistem, dan user experience. Fix approach menggunakan bug condition methodology untuk setiap bug:

1. **Settings Update** - Fix ID lookup untuk update settings
2. **Duplicate Notifications** - Implement deduplication check sebelum create notifikasi
3. **Invoice Race Condition** - Gunakan timestamp-based unique identifier
4. **Case Sensitivity** - Normalize barcode search ke lowercase
5. **Shift Validation** - Validate shift aktif sebelum create transaction
6. **Stock Validation** - Validate stok cukup sebelum process transaction
7. **Cash Payment Validation** - Validate cashPaid >= total untuk payment tunai
8. **Tax Calculation** - Add fallback untuk handle invalid taxRate

Strategi fix: **Defensive programming** dengan input validation, deduplication logic, dan safe defaults untuk mencegah data corruption.

---

## Glossary

- **Bug_Condition (C)**: Kondisi input/state yang memicu bug - berbeda untuk setiap bug
- **Property (P)**: Behavior yang diharapkan ketika bug condition terpenuhi - bug harus teratasi
- **Preservation**: Behavior existing yang harus tetap unchanged
- **DB.setSetting()**: Function di `Database.gs` line ~99 untuk update/insert settings ke sheet
- **createTransaction()**: Function di `Services.gs` line ~77 untuk membuat transaksi baru
- **DB.generateInvoice()**: Function di `Database.gs` line ~72 untuk generate invoice number sequential
- **getProducts()**: Function di `Services.gs` line ~7 untuk filter/search produk dengan barcode
- **Race Condition**: Situasi dimana 2+ operations concurrent mengakses shared resource (transaction count) dan menghasilkan hasil yang salah

---

## Bug Details

### Bug Condition #1: Settings Update Failure

Bug manifests ketika `DB.setSetting(key, value)` dipanggil untuk update existing setting. Function ini memanggil `DB.update(CONFIG.SHEET_NAMES.SETTINGS, key, ...)` dengan `key` sebagai ID parameter, padahal `DB.update()` expects actual `id` field value.

**Formal Specification:**
```
FUNCTION isBugCondition1(input)
  INPUT: input of type { key: string, value: any }
  OUTPUT: boolean
  
  RETURN settingWithKeyExists(input.key) = true
         AND input.key != actualIdField(input.key)
END FUNCTION
```

**Example:**
- Setting record: `{ id: 'abc123', key: 'storeName', value: 'Toko A' }`
- Call: `DB.setSetting('storeName', 'Toko B')`
- Bug: Calls `DB.update('settings', 'storeName', ...)` but should call `DB.update('settings', 'abc123', ...)`
- Result: Update fails silently, value tidak berubah

---

### Bug Condition #2: Duplicate Notifications

Bug manifests ketika `createTransaction()` mengurangi stok produk ke threshold (0 atau <= LOW_STOCK_THRESHOLD). Function membuat notifikasi baru setiap kali tanpa cek apakah notifikasi serupa (produk sama, type sama, unread) sudah ada.

**Formal Specification:**
```
FUNCTION isBugCondition2(input)
  INPUT: input of type { productId: string, newStock: number }
  OUTPUT: boolean
  
  RETURN (newStock = 0 OR newStock <= LOW_STOCK_THRESHOLD)
         AND existingUnreadNotificationExists(input.productId, newStock) = true
END FUNCTION
```

**Example:**
- Transaksi 1: Stok Chitato 10 → 4 (threshold=5), create notif "Chitato tersisa 4"
- Transaksi 2: Stok Chitato 4 → 2, create notif duplikat "Chitato tersisa 2"
- Bug: Notifikasi terus bertambah untuk produk yang sama
- Expected: Hanya create notif baru jika belum ada unread notif untuk produk tersebut

---

### Bug Condition #3: Invoice Race Condition

Bug manifests ketika 2+ transaksi dibuat secara bersamaan (concurrent execution). `DB.generateInvoice()` menggunakan `count = DB.getAll(TRANSACTIONS).length + 1`, sehingga kedua request bisa mendapat count yang sama.

**Formal Specification:**
```
FUNCTION isBugCondition3(input)
  INPUT: input of type { transaction1: Transaction, transaction2: Transaction }
  OUTPUT: boolean
  
  RETURN transaction1.createdAt ≈ transaction2.createdAt (concurrent)
         AND countBasedInvoiceGeneration() = true
END FUNCTION
```

**Example:**
- Time T: Transaction count = 100
- Time T+0ms: Request A calls generateInvoice() → count=101, invoice="INV-20240115-0101"
- Time T+10ms: Request B calls generateInvoice() → count=101 (sama!), invoice="INV-20240115-0101"
- Bug: Invoice number duplikat
- Expected: Setiap invoice unique, bahkan jika concurrent

---

### Bug Condition #4: Case Sensitivity in Barcode Search

Bug manifests ketika `getProducts(filter)` melakukan barcode search dengan `String(p.barcode).includes(q)` tanpa normalize ke lowercase, sedangkan nama dan SKU search sudah case-insensitive.

**Formal Specification:**
```
FUNCTION isBugCondition4(input)
  INPUT: input of type { searchQuery: string, barcode: string }
  OUTPUT: boolean
  
  RETURN input.searchQuery.toLowerCase() != input.searchQuery
         AND input.barcode contains substring matching input.searchQuery (case-sensitive)
         BUT not matching with case-insensitive comparison
END FUNCTION
```

**Example:**
- Barcode produk: `"8991234560010"`
- Search query: `"8991234560010"` → Found ✓
- Search query: `"ABC123"` vs barcode `"abc123"` → Not Found ✗ (inconsistent)
- Bug: Barcode search case-sensitive, nama/SKU case-insensitive
- Expected: Semua search case-insensitive untuk konsistensi

---

### Bug Condition #5: Missing Shift Validation

Bug manifests ketika `createTransaction()` dipanggil tanpa shift aktif atau dengan `shiftId` invalid. Function tidak memvalidasi apakah shift exists dan status='open'.

**Formal Specification:**
```
FUNCTION isBugCondition5(input)
  INPUT: input of type { shiftId: string, kasirId: string }
  OUTPUT: boolean
  
  RETURN input.shiftId = '' 
         OR NOT shiftExists(input.shiftId)
         OR shift.status != 'open'
         OR shift.kasirId != input.kasirId
END FUNCTION
```

**Example:**
- Kasir tidak open shift, create transaksi dengan `shiftId: ''`
- Bug: Transaksi berhasil dibuat tanpa tracking shift
- Expected: Reject transaksi jika tidak ada shift aktif

---

### Bug Condition #6: Negative Stock

Bug manifests ketika `createTransaction()` mengurangi stok dengan qty yang melebihi stok tersedia. Function langsung `newStock = stock - qty` tanpa validasi.

**Formal Specification:**
```
FUNCTION isBugCondition6(input)
  INPUT: input of type { productId: string, requestedQty: number, availableStock: number }
  OUTPUT: boolean
  
  RETURN input.requestedQty > input.availableStock
END FUNCTION
```

**Example:**
- Produk stok: 5
- Transaksi qty: 10
- Bug: `newStock = 5 - 10 = -5`, stok menjadi negatif
- Expected: Reject transaksi dengan error "Stok tidak cukup"

---

### Bug Condition #7: Cash Payment Validation

Bug manifests ketika `createTransaction()` dengan `paymentMethod='tunai'` dan `cashPaid < total`. Function tidak validasi jumlah cash cukup.

**Formal Specification:**
```
FUNCTION isBugCondition7(input)
  INPUT: input of type { paymentMethod: string, cashPaid: number, total: number }
  OUTPUT: boolean
  
  RETURN input.paymentMethod = 'tunai'
         AND input.cashPaid < input.total
END FUNCTION
```

**Example:**
- Total: Rp 50,000
- Payment: tunai, cashPaid: Rp 30,000
- Bug: Transaksi tetap dibuat, change bisa negatif atau salah
- Expected: Reject dengan error "Pembayaran tunai tidak cukup"

---

### Bug Condition #8: Tax Calculation Error

Bug manifests ketika `createTransaction()` menghitung tax dengan `settings.taxRate` yang invalid (undefined, null, non-numeric string). `parseFloat()` menghasilkan NaN.

**Formal Specification:**
```
FUNCTION isBugCondition8(input)
  INPUT: input of type { taxRate: any, subtotal: number }
  OUTPUT: boolean
  
  RETURN isNaN(parseFloat(input.taxRate)) = true
         OR input.taxRate = undefined
         OR input.taxRate = null
END FUNCTION
```

**Example:**
- `settings.taxRate = undefined` atau `"abc"`
- Calculation: `tax = Math.round(subtotal * NaN / 100)` → `NaN`
- Bug: `total = subtotal + NaN` → `NaN`
- Expected: Default taxRate ke 0 jika invalid, total tetap valid

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors - Settings:**
- Insert new settings dengan key baru harus tetap bekerja
- `getSetting()` dan `getAllSettings()` return nilai correct tanpa perubahan

**Unchanged Behaviors - Notifications:**
- Notifikasi non-stok (jika ada) tetap dibuat normal
- Mark read, delete, get notifications tetap bekerja

**Unchanged Behaviors - Transactions:**
- Payment method 'qris'/'debit' tidak perlu cashPaid validation
- `includeTax=false` tetap set tax=0
- Customer totalSpend, shift updates tetap bekerja
- Transaction items insert tetap bekerja

**Unchanged Behaviors - Invoice:**
- Format `INV-YYYYMMDD-XXXX` tetap digunakan (hanya mechanism berubah)

**Unchanged Behaviors - Products:**
- Search by nama/SKU case-insensitive tetap bekerja
- Save, delete, getByBarcode exact match tetap bekerja

**Unchanged Behaviors - Shifts:**
- Open, close, get shifts tetap bekerja normal
- Valid shift updates totalSales/txCount tetap bekerja

---

## Hypothesized Root Cause

**Bug #1: Settings Update**
1. **Incorrect ID Parameter**: `setSetting()` menggunakan `key` sebagai ID, tapi `update()` expects field `id`
2. **Missing ID Lookup**: Tidak ada lookup untuk mendapat actual `id` value dari record dengan `key` tertentu

**Bug #2: Duplicate Notifications**
1. **No Deduplication Logic**: Code tidak cek existing notifications sebelum create
2. **Always Insert**: Setiap trigger kondisi langsung insert tanpa conditional

**Bug #3: Invoice Race Condition**
1. **Count-Based Sequential**: Menggunakan array length sebagai counter (non-atomic)
2. **No Locking Mechanism**: Tidak ada lock/transaction untuk ensure uniqueness
3. **Concurrent Read-Modify-Write**: Dua request bisa baca count yang sama sebelum salah satunya write

**Bug #4: Case Sensitivity**
1. **Inconsistent String Comparison**: Nama/SKU pakai `toLowerCase()`, barcode tidak
2. **Copy-Paste Oversight**: Kemungkinan lupa normalize barcode saat implement filter

**Bug #5: Missing Shift Validation**
1. **No Validation Check**: Function langsung proceed tanpa cek shift validity
2. **Optional ShiftId**: `shiftId` treated as optional, tidak enforced

**Bug #6: Negative Stock**
1. **No Pre-Validation**: Tidak ada qty validation sebelum stock deduction
2. **Direct Subtraction**: Langsung `stock - qty` tanpa boundary check

**Bug #7: Cash Payment Validation**
1. **No Payment Validation**: Tidak ada validation logic untuk payment method specific
2. **Assume Sufficient**: Code assume cashPaid always sufficient

**Bug #8: Tax Calculation**
1. **No Null/Undefined Handling**: `parseFloat(settings.taxRate)` bisa return NaN
2. **No Fallback Value**: Tidak ada `|| 0` fallback untuk safe default

---

## Correctness Properties

**Property 1: Bug Condition - Settings Update Success**

_For any_ call to `DB.setSetting(key, value)` where a setting with that key already exists, the fixed function SHALL find the record by key, retrieve its actual `id` field, and successfully update the value using that correct ID.

**Validates: Requirements 2.1, 2.2**

---

**Property 2: Bug Condition - Notification Deduplication**

_For any_ transaction that reduces product stock to threshold levels, the fixed function SHALL check for existing unread notifications with the same product and condition, and only create a new notification if none exists.

**Validates: Requirements 2.3, 2.4**

---

**Property 3: Bug Condition - Unique Invoice Generation**

_For any_ concurrent transaction creation scenario, the fixed `generateInvoice()` function SHALL generate unique invoice numbers using timestamp and random components, preventing duplicates even under race conditions.

**Validates: Requirements 2.5, 2.6**

---

**Property 4: Bug Condition - Case-Insensitive Barcode Search**

_For any_ barcode search query in `getProducts()`, the fixed function SHALL normalize both the barcode and search query to lowercase before comparison, ensuring consistent case-insensitive search behavior.

**Validates: Requirements 2.7, 2.8**

---

**Property 5: Bug Condition - Shift Validation Required**

_For any_ transaction creation attempt, the fixed function SHALL validate that the kasir has an active shift (status='open') and reject the transaction with an error message if no valid shift exists.

**Validates: Requirements 2.9, 2.10**

---

**Property 6: Bug Condition - Stock Availability Validation**

_For any_ transaction with items, the fixed function SHALL validate that each product has sufficient stock (stock >= qty) before processing, and reject the entire transaction with a descriptive error if any item has insufficient stock.

**Validates: Requirements 2.11, 2.12**

---

**Property 7: Bug Condition - Cash Payment Sufficiency**

_For any_ transaction with paymentMethod='tunai', the fixed function SHALL validate that cashPaid >= total and reject the transaction with an error message if the cash payment is insufficient.

**Validates: Requirements 2.13, 2.14**

---

**Property 8: Bug Condition - Safe Tax Calculation**

_For any_ transaction calculation, the fixed function SHALL handle invalid taxRate values by using a fallback of 0, ensuring that tax and total calculations never result in NaN values.

**Validates: Requirements 2.15, 2.16**

---

**Property 9: Preservation - Non-Buggy Settings Operations**

_For any_ setting operations that do NOT involve updating existing settings (new key inserts, getSetting calls), the fixed code SHALL produce exactly the same behavior as the original code, preserving insert and read functionality.

**Validates: Requirements 3.1, 3.2**

---

**Property 10: Preservation - Valid Transaction Processing**

_For any_ transaction that meets all validation criteria (valid shift, sufficient stock, sufficient cash if applicable, valid taxRate), the fixed code SHALL process the transaction exactly as before, including customer totalSpend updates, shift updates, and transaction item creation.

**Validates: Requirements 3.5, 3.6, 3.7, 3.8, 3.12, 3.13**

---

**Property 11: Preservation - Other Product Search Behaviors**

_For any_ product search by name or SKU, the fixed code SHALL maintain the existing case-insensitive behavior without modification, and exact barcode matches in `getProductByBarcode()` SHALL continue to work identically.

**Validates: Requirements 3.10, 3.11**

---

## Fix Implementation

### Changes Required

**File**: `c:\Users\benerd\AplikasiKasir\Database.gs`

**Function**: `DB.setSetting()` (line ~99)

**Bug #1 Fix - Settings Update:**
1. **Find Existing Record**: Query `getAll(SETTINGS)` to find record with matching `key`
2. **Extract Actual ID**: Get the `id` field from found record
3. **Update with Correct ID**: Call `update(SETTINGS, exists.id, { value })` instead of `update(SETTINGS, key, ...)`

**Code Change:**
```javascript
// BEFORE (buggy):
if (exists) this.update(CONFIG.SHEET_NAMES.SETTINGS, key, { value });

// AFTER (fixed):
if (exists) this.update(CONFIG.SHEET_NAMES.SETTINGS, exists.id, { value });
```

---

**Function**: `DB.generateInvoice()` (line ~72)

**Bug #3 Fix - Invoice Race Condition:**
1. **Use Timestamp**: Get current timestamp dengan milliseconds
2. **Add Random Component**: Generate 4-digit random untuk uniqueness
3. **New Format**: `INV-YYYYMMDD-HHmmssSSS-RRRR` atau keep existing format dengan timestamp-based sequential

**Alternative Approach**: Keep format `INV-YYYYMMDD-XXXX` tapi gunakan timestamp millis untuk XXXX:
```javascript
// AFTER (fixed):
generateInvoice() {
  const now = new Date();
  const pad = n => String(n).padStart(2,'0');
  const date = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}`;
  const time = now.getTime(); // milliseconds since epoch
  const unique = String(time).slice(-8) + String(Math.floor(Math.random()*1000)).padStart(3,'0');
  const sequence = unique.substring(unique.length - 4); // last 4 digits
  return `INV-${date}-${sequence}`;
}
```

---

**File**: `c:\Users\benerd\AplikasiKasir\Services.gs`

**Function**: `createTransaction()` (line ~77)

**Bug #2 Fix - Duplicate Notifications:**
1. **Check Existing Notifications**: Before insert notification, query `getAll(NOTIFICATIONS)` untuk check unread notif dengan criteria:
   - `isRead = 'false'`
   - `message` contains product name
   - Same type ('warning' or 'danger')
2. **Conditional Insert**: Hanya insert jika tidak ada notifikasi matching

**Code Change:**
```javascript
// BEFORE (buggy):
if (newStock === 0) {
  DB.insert(CONFIG.SHEET_NAMES.NOTIFICATIONS, { id: DB.generateId(), type:'danger', title:'Stok Habis', message:`${prod.name} sudah habis`, isRead:'false', createdAt: now });
} else if (newStock <= CONFIG.LOW_STOCK_THRESHOLD) {
  DB.insert(CONFIG.SHEET_NAMES.NOTIFICATIONS, { id: DB.generateId(), type:'warning', title:'Stok Menipis', message:`${prod.name} tersisa ${newStock} item`, isRead:'false', createdAt: now });
}

// AFTER (fixed):
if (newStock === 0) {
  const existingNotif = DB.getAll(CONFIG.SHEET_NAMES.NOTIFICATIONS).find(n => 
    n.isRead === 'false' && n.type === 'danger' && n.message.includes(prod.name)
  );
  if (!existingNotif) {
    DB.insert(CONFIG.SHEET_NAMES.NOTIFICATIONS, { id: DB.generateId(), type:'danger', title:'Stok Habis', message:`${prod.name} sudah habis`, isRead:'false', createdAt: now });
  }
} else if (newStock <= CONFIG.LOW_STOCK_THRESHOLD) {
  const existingNotif = DB.getAll(CONFIG.SHEET_NAMES.NOTIFICATIONS).find(n => 
    n.isRead === 'false' && n.type === 'warning' && n.message.includes(prod.name)
  );
  if (!existingNotif) {
    DB.insert(CONFIG.SHEET_NAMES.NOTIFICATIONS, { id: DB.generateId(), type:'warning', title:'Stok Menipis', message:`${prod.name} tersisa ${newStock} item`, isRead:'false', createdAt: now });
  }
}
```

**Bug #4 Fix - Case Sensitivity:**
1. **Normalize Barcode**: Add `.toLowerCase()` pada barcode comparison

**Code Change (line ~11):**
```javascript
// BEFORE (buggy):
prods = prods.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || String(p.barcode).includes(q));

// AFTER (fixed):
prods = prods.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || String(p.barcode).toLowerCase().includes(q));
```

**Bug #5 Fix - Shift Validation:**
1. **Validate Active Shift**: Check bahwa kasir punya shift dengan `status='open'`
2. **Early Return**: Return error jika tidak ada shift aktif

**Code Change (add before line ~84):**
```javascript
// AFTER (fixed - add validation):
// Validasi shift aktif
const activeShift = DB.filter(CONFIG.SHEET_NAMES.SHIFTS, s => 
  s.kasirId === session.userId && s.status === 'open'
);
if (activeShift.length === 0) {
  return { success: false, message: 'Tidak ada shift aktif. Silakan buka shift terlebih dahulu.' };
}
// Use the active shift
data.shiftId = activeShift[0].id;
```

**Bug #6 Fix - Stock Validation:**
1. **Pre-Validate Stock**: Before processing, loop items dan cek stock availability
2. **Early Return**: Return error dengan product name jika stok tidak cukup

**Code Change (add after shift validation):**
```javascript
// AFTER (fixed - add validation):
// Validasi stok tersedia untuk semua items
for (const item of data.items) {
  const prod = DB.getById(CONFIG.SHEET_NAMES.PRODUCTS, item.productId);
  if (!prod) {
    return { success: false, message: `Produk ${item.name} tidak ditemukan.` };
  }
  if (parseInt(prod.stock) < parseInt(item.qty)) {
    return { success: false, message: `Stok ${prod.name} tidak cukup. Tersedia: ${prod.stock}, diminta: ${item.qty}` };
  }
}
```

**Bug #7 Fix - Cash Payment Validation:**
1. **Validate Cash Sufficiency**: Check jika payment method 'tunai', cashPaid >= total
2. **Early Return**: Return error jika cash tidak cukup

**Code Change (add after stock validation):**
```javascript
// AFTER (fixed - add validation):
// Validasi pembayaran tunai
if (data.paymentMethod === 'tunai') {
  const cashPaid = parseFloat(data.cashPaid) || 0;
  if (cashPaid < total) {
    return { success: false, message: `Pembayaran tunai tidak cukup. Total: ${total}, dibayar: ${cashPaid}` };
  }
}
```

**Bug #8 Fix - Tax Calculation:**
1. **Add Fallback**: Use `|| 0` untuk handle invalid taxRate

**Code Change (line ~90):**
```javascript
// BEFORE (buggy):
const taxRate = parseFloat(settings.taxRate) || 0;

// Already correct in current code! Just verify it's there.
// If not, change from:
const taxRate = parseFloat(settings.taxRate);
// To:
const taxRate = parseFloat(settings.taxRate) || 0;
```

---

## Testing Strategy

### Validation Approach

Testing strategy menggunakan **two-phase approach**:
1. **Exploratory Bug Condition Checking**: Write tests BEFORE fix untuk surface counterexamples
2. **Fix & Preservation Validation**: Verify fix works dan tidak break existing behavior

Karena ada 8 bugs, kita akan group tests secara logical:
- **Database Layer Tests**: Bug #1, #3
- **Transaction Validation Tests**: Bug #5, #6, #7, #8
- **Business Logic Tests**: Bug #2, #4

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples untuk setiap bug BEFORE implementing fix. Confirm root cause analysis.

**Test Plan**: Write unit tests yang reproduce setiap bug condition, run on UNFIXED code untuk observe failures.

**Test Cases - Database Layer (Bug #1, #3):**

1. **Settings Update Test (Bug #1)**: 
   - Setup: Create setting `{ id: 'xyz', key: 'storeName', value: 'Old' }`
   - Action: Call `DB.setSetting('storeName', 'New')`
   - Assert: Value should be 'New'
   - Expected on UNFIXED: FAIL - value remains 'Old'

2. **Invoice Uniqueness Test (Bug #3)**:
   - Setup: Create multiple transactions simultaneously
   - Action: Generate invoices for each concurrently
   - Assert: All invoice numbers unique
   - Expected on UNFIXED: FAIL - possible duplicates

**Test Cases - Transaction Validation (Bug #5, #6, #7, #8):**

3. **No Shift Rejection Test (Bug #5)**:
   - Setup: Close all shifts for kasir
   - Action: Call `createTransaction(...)` without shift
   - Assert: Should return `{ success: false, message: '...shift...' }`
   - Expected on UNFIXED: FAIL - transaction created

4. **Insufficient Stock Test (Bug #6)**:
   - Setup: Product with stock=5
   - Action: Create transaction with qty=10
   - Assert: Should return error, stock should remain 5
   - Expected on UNFIXED: FAIL - stock becomes -5

5. **Insufficient Cash Test (Bug #7)**:
   - Setup: Transaction total=50000
   - Action: Create transaction with paymentMethod='tunai', cashPaid=30000
   - Assert: Should return error
   - Expected on UNFIXED: FAIL - transaction created with negative/incorrect change

6. **Invalid TaxRate Test (Bug #8)**:
   - Setup: Set `settings.taxRate = undefined` or `'abc'`
   - Action: Create transaction with `includeTax=true`
   - Assert: Total should be valid number (not NaN)
   - Expected on UNFIXED: FAIL - total is NaN

**Test Cases - Business Logic (Bug #2, #4):**

7. **Duplicate Notification Test (Bug #2)**:
   - Setup: Product with stock=10, create transaction to reduce stock to 4 (below threshold=5)
   - Observe: Notification created (correct)
   - Action: Create another transaction to reduce stock to 2
   - Assert: Should NOT create duplicate notification
   - Expected on UNFIXED: FAIL - duplicate notification created

8. **Case-Insensitive Barcode Test (Bug #4)**:
   - Setup: Product with barcode='ABC123' (if system allows alpha barcode)
   - Action: Search with `getProducts({ search: 'abc123' })`
   - Assert: Should find product (case-insensitive)
   - Expected on UNFIXED: FAIL - product not found (case-sensitive)

**Expected Counterexamples**:
- Bug #1: `setSetting()` fails to update existing settings
- Bug #2: Multiple identical notifications pile up
- Bug #3: Concurrent transactions get same invoice number
- Bug #4: Barcode search case-sensitive, unlike name/SKU
- Bug #5: Transaction created without shift validation
- Bug #6: Stock goes negative
- Bug #7: Insufficient cash payment accepted
- Bug #8: Tax calculation returns NaN

### Fix Checking

**Goal**: Verify bahwa untuk setiap bug condition yang holds, fixed function produces expected behavior.

**Pseudocode:**
```
FOR ALL bug IN [Bug1..Bug8] DO
  FOR ALL input WHERE isBugCondition_N(input) DO
    result := fixedFunction(input)
    ASSERT expectedBehavior_N(result)
  END FOR
END FOR
```

**Testing Approach**: Re-run semua exploratory tests di atas pada FIXED code, verify semua pass.

### Preservation Checking

**Goal**: Verify bahwa untuk input yang TIDAK trigger bug conditions, fixed functions produce same result sebagai original.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition_N(input) DO
  ASSERT originalFunction(input) ≈ fixedFunction(input)
END FOR
```

**Testing Approach**: Property-based testing recommended untuk preservation karena:
- Generates many test cases automatically
- Catches edge cases
- Provides strong guarantees

**Test Plan**: Observe behavior on UNFIXED code untuk non-bug cases, write tests capturing that behavior.

**Preservation Test Cases:**

1. **New Settings Insert Preserved**:
   - Action: `DB.setSetting('newKey', 'value')` for non-existing key
   - Assert: Should insert successfully (same as before)

2. **Valid Transaction Preserved**:
   - Action: Create transaction with valid shift, sufficient stock, sufficient cash, valid taxRate
   - Assert: Transaction created, stock reduced, shift updated, customer totalSpend updated (same as before)

3. **Non-Tunai Payment Preserved**:
   - Action: Create transaction with paymentMethod='qris' or 'debit'
   - Assert: No cashPaid validation required, transaction successful (same as before)

4. **Name/SKU Search Preserved**:
   - Action: Search products by name or SKU (not barcode)
   - Assert: Case-insensitive search still works (same as before)

5. **Zero Tax Transactions Preserved**:
   - Action: Create transaction with `includeTax=false`
   - Assert: Tax=0, total correct (same as before)

### Unit Tests

**Database Layer:**
- Test `setSetting()` untuk existing dan new keys
- Test `generateInvoice()` uniqueness
- Test `update()` dengan correct ID parameter

**Transaction Validation:**
- Test shift validation dengan active/inactive/missing shifts
- Test stock validation dengan sufficient/insufficient stock
- Test cash validation untuk tunai payment
- Test tax calculation dengan valid/invalid taxRate

**Business Logic:**
- Test notification deduplication logic
- Test case-insensitive barcode search
- Test product filtering by category, status

### Property-Based Tests

**Property 1-8**: Generate random inputs satisfying each bug condition, verify correct behavior
**Property 9-11**: Generate random inputs NOT satisfying bug conditions, verify preserved behavior

**Examples:**
- Generate random product stock levels and transaction quantities
- Generate random payment methods and amounts
- Generate random taxRate values (valid and invalid)
- Generate random barcode strings with mixed case

### Integration Tests

**Full Transaction Flow:**
- Test end-to-end transaction creation dengan semua validations
- Test shift open → transaction → shift close flow
- Test stock reduction → notification creation flow
- Test multiple concurrent transactions (invoice uniqueness)
- Test transaction dengan berbagai payment methods
- Test transaction reports dengan fixed data
