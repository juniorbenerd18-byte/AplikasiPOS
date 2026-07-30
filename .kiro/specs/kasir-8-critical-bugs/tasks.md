# Implementation Plan - 8 Critical Bugs Fix

- [x] 1. Write bug condition exploration tests (BEFORE fix)
  - **Property 1: Bug Condition** - Settings Update Failure
  - **CRITICAL**: Write these tests BEFORE implementing fixes
  - **GOAL**: Surface counterexamples demonstrating all 8 bugs exist
  - **Test Approach**: Unit tests for each bug scenario on UNFIXED code
  - Create test file for Database layer bugs (#1, #3)
  - Test Bug #1: Call `DB.setSetting('storeName', 'New')` on existing setting, assert value updated (will FAIL - value stays old)
  - Test Bug #3: Generate multiple invoices concurrently, assert all unique (will FAIL - possible duplicates)
  - Create test file for Transaction validation bugs (#5, #6, #7, #8)
  - Test Bug #5: Create transaction without active shift, assert rejection (will FAIL - transaction created)
  - Test Bug #6: Create transaction with qty > stock, assert rejection and stock unchanged (will FAIL - stock negative)
  - Test Bug #7: Create transaction paymentMethod='tunai' with cashPaid < total, assert rejection (will FAIL - accepted)
  - Test Bug #8: Create transaction with invalid taxRate (undefined/'abc'), assert total is valid number (will FAIL - NaN)
  - Create test file for Business logic bugs (#2, #4)
  - Test Bug #2: Reduce stock to threshold twice, assert only one notification (will FAIL - duplicates)
  - Test Bug #4: Search barcode with different case, assert found (will FAIL - case-sensitive)
  - Run all tests on UNFIXED code
  - **EXPECTED OUTCOME**: All 8 tests FAIL (confirms bugs exist)
  - Document counterexamples found for each bug
  - _Requirements: 1.1-1.16_

- [ ] 2. Write preservation property tests (BEFORE fix)
  - **Property 2: Preservation** - Non-Buggy Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: `DB.setSetting('newKey', 'val')` inserts successfully on unfixed code
  - Observe: Valid transactions (good shift, sufficient stock, sufficient cash, valid tax) process correctly
  - Observe: Non-tunai payments don't require cashPaid validation
  - Observe: Name/SKU search case-insensitive works correctly
  - Observe: `includeTax=false` results in tax=0
  - Write property tests capturing observed behaviors:
    - Test new settings insert (non-existing key)
    - Test valid transaction creation (all criteria met)
    - Test qris/debit payment (no cash validation)
    - Test name/SKU search case-insensitive
    - Test zero tax transactions
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: All preservation tests PASS (confirms baseline behavior)
  - _Requirements: 3.1-3.13_

- [ ] 3. Fix 8 Critical Bugs

  - [ ] 3.1 Fix Bug #1: Settings Update (Database.gs)
    - Open `c:\Users\benerd\AplikasiKasir\Database.gs`
    - Locate `setSetting()` function (line ~99)
    - Change `this.update(CONFIG.SHEET_NAMES.SETTINGS, key, { value })` to `this.update(CONFIG.SHEET_NAMES.SETTINGS, exists.id, { value })`
    - Use `exists.id` instead of `key` for correct ID lookup
    - _Bug_Condition: isBugCondition1 where settingWithKeyExists=true AND key != actualId_
    - _Expected_Behavior: Successfully update setting value using correct ID_
    - _Preservation: New key inserts, getSetting/getAllSettings unchanged_
    - _Requirements: 2.1, 2.2, 3.1, 3.2_

  - [ ] 3.2 Fix Bug #2: Duplicate Notifications (Services.gs)
    - Open `c:\Users\benerd\AplikasiKasir\Services.gs`
    - Locate notification creation in `createTransaction()` (line ~107-112)
    - Add deduplication check before `DB.insert(NOTIFICATIONS, ...)`:
      - Query existing notifications: `DB.getAll(NOTIFICATIONS).find(n => n.isRead === 'false' && n.type === [type] && n.message.includes(prod.name))`
      - Only insert if `!existingNotif`
    - Apply for both `newStock === 0` (danger) and `newStock <= threshold` (warning) cases
    - _Bug_Condition: isBugCondition2 where stock at threshold AND duplicate unread notification exists_
    - _Expected_Behavior: Check existing notifications, only create if none exist_
    - _Preservation: Non-stock notifications, mark read/delete functions unchanged_
    - _Requirements: 2.3, 2.4, 3.3, 3.4_

  - [ ] 3.3 Fix Bug #3: Invoice Race Condition (Database.gs)
    - Open `c:\Users\benerd\AplikasiKasir\Database.gs`
    - Locate `generateInvoice()` function (line ~72)
    - Replace count-based logic with timestamp-based unique generation:
      - Get `now.getTime()` for milliseconds
      - Generate random 3-digit: `Math.floor(Math.random()*1000)`
      - Create unique sequence: `String(time).slice(-8) + String(random).padStart(3,'0')`
      - Use last 4 digits for format `INV-YYYYMMDD-XXXX`
    - Keep date format consistent, only change sequential mechanism
    - _Bug_Condition: isBugCondition3 where concurrent transactions use same count_
    - _Expected_Behavior: Generate unique invoice using timestamp+random, prevent duplicates_
    - _Preservation: Invoice format INV-YYYYMMDD-XXXX unchanged (mechanism only)_
    - _Requirements: 2.5, 2.6, 3.9_

  - [ ] 3.4 Fix Bug #4: Case-Insensitive Barcode (Services.gs)
    - Open `c:\Users\benerd\AplikasiKasir\Services.gs`
    - Locate `getProducts()` filter logic (line ~11)
    - Add `.toLowerCase()` to barcode comparison: `String(p.barcode).toLowerCase().includes(q)`
    - Ensure consistency with name and SKU search (already case-insensitive)
    - _Bug_Condition: isBugCondition4 where barcode search is case-sensitive_
    - _Expected_Behavior: Normalize barcode to lowercase for consistent search_
    - _Preservation: Name/SKU search, exact barcode match in getProductByBarcode unchanged_
    - _Requirements: 2.7, 2.8, 3.10, 3.11_

  - [ ] 3.5 Fix Bug #5: Shift Validation (Services.gs)
    - Open `c:\Users\benerd\AplikasiKasir\Services.gs`
    - Locate `createTransaction()` function start (line ~77)
    - Add validation after session check (before calculations):
      ```javascript
      const activeShift = DB.filter(CONFIG.SHEET_NAMES.SHIFTS, s => 
        s.kasirId === session.userId && s.status === 'open'
      );
      if (activeShift.length === 0) {
        return { success: false, message: 'Tidak ada shift aktif. Silakan buka shift terlebih dahulu.' };
      }
      data.shiftId = activeShift[0].id;
      ```
    - Validate before any processing
    - _Bug_Condition: isBugCondition5 where no active shift exists for kasir_
    - _Expected_Behavior: Validate active shift, reject transaction if none_
    - _Preservation: Valid shift transactions, shift open/close functions unchanged_
    - _Requirements: 2.9, 2.10, 3.12, 3.13_

  - [ ] 3.6 Fix Bug #6: Stock Validation (Services.gs)
    - In `createTransaction()` after shift validation
    - Add stock availability check before processing:
      ```javascript
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
    - Validate all items before any stock modification
    - _Bug_Condition: isBugCondition6 where requested qty > available stock_
    - _Expected_Behavior: Validate stock sufficiency, reject if insufficient_
    - _Preservation: Sufficient stock transactions process normally_
    - _Requirements: 2.11, 2.12, 3.8_

  - [ ] 3.7 Fix Bug #7: Cash Payment Validation (Services.gs)
    - In `createTransaction()` after stock validation
    - Add cash payment sufficiency check:
      ```javascript
      if (data.paymentMethod === 'tunai') {
        const cashPaid = parseFloat(data.cashPaid) || 0;
        if (cashPaid < total) {
          return { success: false, message: `Pembayaran tunai tidak cukup. Total: ${total}, dibayar: ${cashPaid}` };
        }
      }
      ```
    - Only validate for 'tunai' method
    - _Bug_Condition: isBugCondition7 where paymentMethod='tunai' AND cashPaid < total_
    - _Expected_Behavior: Validate cash sufficiency, reject if insufficient_
    - _Preservation: qris/debit payments unchanged (no cash validation)_
    - _Requirements: 2.13, 2.14, 3.5_

  - [ ] 3.8 Fix Bug #8: Tax Calculation Safety (Services.gs)
    - In `createTransaction()` tax calculation (line ~90)
    - Verify fallback exists: `const taxRate = parseFloat(settings.taxRate) || 0;`
    - If not present, add `|| 0` fallback to prevent NaN
    - _Bug_Condition: isBugCondition8 where taxRate is invalid (undefined/null/non-numeric)_
    - _Expected_Behavior: Default to 0 if taxRate invalid, prevent NaN_
    - _Preservation: Valid taxRate calculations, includeTax=false unchanged_
    - _Requirements: 2.15, 2.16, 3.6_

  - [ ] 3.9 Verify all bug condition tests now pass
    - **Property 1: Expected Behavior** - All Bugs Fixed
    - **IMPORTANT**: Re-run the SAME tests from task 1
    - Run all 8 bug condition tests on FIXED code
    - Test #1: Settings update succeeds
    - Test #2: No duplicate notifications
    - Test #3: Unique invoices even concurrent
    - Test #4: Case-insensitive barcode search
    - Test #5: Transaction rejected without shift
    - Test #6: Transaction rejected with insufficient stock
    - Test #7: Transaction rejected with insufficient cash
    - Test #8: Tax calculation safe (no NaN)
    - **EXPECTED OUTCOME**: All tests PASS (confirms bugs fixed)
    - _Requirements: 2.1-2.16_

  - [ ] 3.10 Verify preservation tests still pass
    - **Property 2: Preservation** - No Regressions
    - **IMPORTANT**: Re-run the SAME tests from task 2
    - Run all preservation tests on FIXED code
    - New settings insert still works
    - Valid transactions process normally
    - Non-tunai payments work without cash validation
    - Name/SKU search case-insensitive preserved
    - Zero tax transactions work correctly
    - **EXPECTED OUTCOME**: All tests PASS (confirms no regressions)
    - _Requirements: 3.1-3.13_

- [ ] 4. Checkpoint - Ensure all tests pass and system is stable
  - Run complete test suite (exploration + preservation)
  - Manually test critical flows:
    - Settings update existing values
    - Create multiple transactions (check invoice uniqueness)
    - Create transaction without shift (should reject)
    - Create transaction with insufficient stock (should reject)
    - Create transaction with insufficient cash payment (should reject)
    - Reduce stock to threshold multiple times (only one notification)
    - Search products by barcode with different cases
    - Create transaction with invalid taxRate in settings
  - Verify no console errors or unexpected behaviors
  - Confirm all 8 bugs are resolved
  - Ask user if any issues or questions arise
