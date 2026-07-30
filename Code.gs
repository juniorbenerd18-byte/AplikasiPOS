// ============================================================
// Code.gs - Backend Core & APIs (Combined)
// ============================================================

// ========================================== 
// Section: Config.gs 
// ========================================== 

// ============================================================
// Config.gs - Konstanta & Konfigurasi
// ============================================================

var CONFIG = {
  SHEET_NAMES: {
    USERS:         'users',
    PRODUCTS:      'products',
    CATEGORIES:    'categories',
    CUSTOMERS:     'customers',
    TRANSACTIONS:  'transactions',
    TX_ITEMS:      'transaction_items',
    SHIFTS:        'shifts',
    SETTINGS:      'settings',
    NOTIFICATIONS: 'notifications',
  },
  DEFAULT_SETTINGS: {
    storeName:      'Toko Saya',
    logo:           '',
    address:        'Jl. Contoh No. 1, Kota Anda',
    phone:          '021-12345678',
    taxRate:        10,
    currency:       'IDR',
    currencySymbol: 'Rp',
    receiptFooter:  'Terima kasih telah berbelanja!',
  },
  LOW_STOCK_THRESHOLD: 5,
};

// Ambil atau buat spreadsheet utama
function getSpreadsheet() {
  const props = PropertiesService.getScriptProperties();
  let ssId = props.getProperty('SPREADSHEET_ID');
  if (ssId) {
    try { return SpreadsheetApp.openById(ssId); } catch(e) {}
  }
  const ss = SpreadsheetApp.create('AplikasiKasir_Database');
  props.setProperty('SPREADSHEET_ID', ss.getId());
  return ss;
}

// Ambil sheet by name, buat kalau belum ada
function getSheet(name) {
  const ss = getSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    initSheetHeaders(sh, name);
  }
  return sh;
}

function initSheetHeaders(sh, name) {
  const headers = {
    users:             ['id','name','email','password','role','avatar','createdAt'],
    products:          ['id','name','sku','barcode','categoryId','price','stock','photo','status','createdAt'],
    categories:        ['id','name','icon','color','status'],
    customers:         ['id','name','phone','isMember','totalSpend','createdAt'],
    transactions:      ['id','invoice','kasirId','customerId','subtotal','discount','tax','total','paymentMethod','cashPaid','change','status','shiftId','createdAt'],
    transaction_items: ['id','transactionId','productId','name','price','qty','discount','note'],
    shifts:            ['id','kasirId','openTime','closeTime','modalAwal','totalSales','txCount','kasNote','status'],
    settings:          ['key','value'],
    notifications:     ['id','type','title','message','isRead','createdAt'],
  };
  if (headers[name]) sh.appendRow(headers[name]);
}


// ========================================== 
// Section: Database.gs 
// ========================================== 

// ============================================================
// Database.gs - CRUD Layer untuk Google Sheets
// ============================================================

var DB = {

  // Baca semua rows sebagai array of objects
  getAll(sheetName) {
    const sh = getSheet(sheetName);
    const data = sh.getDataRange().getValues();
    if (data.length <= 1) return [];
    const headers = data[0];
    return data.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      return obj;
    });
  },

  // Ambil satu row by id
  getById(sheetName, id) {
    return this.getAll(sheetName).find(r => r.id === id) || null;
  },

  // Insert row baru
  insert(sheetName, data) {
    const sh = getSheet(sheetName);
    const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    const row = headers.map(h => data[h] !== undefined ? data[h] : '');
    sh.appendRow(row);
    return data;
  },

  // Update row by id
  update(sheetName, id, updates) {
    const sh = getSheet(sheetName);
    const data = sh.getDataRange().getValues();
    if (data.length <= 1) return null;
    const headers = data[0];
    const idCol = headers.indexOf('id');
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === String(id)) {
        headers.forEach((h, j) => {
          if (updates[h] !== undefined) sh.getRange(i + 1, j + 1).setValue(updates[h]);
        });
        // Set updatedAt if column exists
        const uaIdx = headers.indexOf('updatedAt');
        if (uaIdx >= 0) sh.getRange(i + 1, uaIdx + 1).setValue(new Date().toISOString());
        return true;
      }
    }
    return false;
  },

  // Hapus row by id
  delete(sheetName, id) {
    const sh = getSheet(sheetName);
    const data = sh.getDataRange().getValues();
    const headers = data[0];
    const idCol = headers.indexOf('id');
    for (let i = data.length - 1; i >= 1; i--) {
      if (String(data[i][idCol]) === String(id)) {
        sh.deleteRow(i + 1);
        return true;
      }
    }
    return false;
  },

  // Filter rows
  filter(sheetName, fn) {
    return this.getAll(sheetName).filter(fn);
  },

  // Generate unique ID
  generateId() {
    return Utilities.getUuid().replace(/-/g,'').substring(0, 16);
  },

  // Generate invoice number (Bug #3 fix: timestamp+random untuk hindari race condition)
  generateInvoice() {
    const now = new Date();
    const pad = n => String(n).padStart(2,'0');
    const date = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}`;
    const time = String(now.getTime()).slice(-8);
    const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    const uniqueSeq = (time + random).slice(-4);
    return `INV-${date}-${uniqueSeq}`;
  },

  // Settings helper
  getSetting(key) {
    const rows = this.getAll(CONFIG.SHEET_NAMES.SETTINGS);
    const row = rows.find(r => r.key === key);
    return row ? row.value : (CONFIG.DEFAULT_SETTINGS[key] || '');
  },

  setSetting(key, value) {
    const rows = this.getAll(CONFIG.SHEET_NAMES.SETTINGS);
    const exists = rows.find(r => r.key === key);
    if (exists) {
      this.update(CONFIG.SHEET_NAMES.SETTINGS, exists.id, { value });
    } else {
      this.insert(CONFIG.SHEET_NAMES.SETTINGS, { 
        id: this.generateId(), 
        key, 
        value 
      });
    }
  },

  getAllSettings() {
    const rows = this.getAll(CONFIG.SHEET_NAMES.SETTINGS);
    const settings = { ...CONFIG.DEFAULT_SETTINGS };
    rows.forEach(r => { if (r.key) settings[r.key] = r.value; });
    return settings;
  },

  // Batch insert multiple rows at once (much faster than individual inserts)
  insertBatch(sheetName, dataArray) {
    if (!dataArray || dataArray.length === 0) return;
    const sh = getSheet(sheetName);
    const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    const rows = dataArray.map(data => {
      return headers.map(h => data[h] !== undefined ? data[h] : '');
    });
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, headers.length).setValues(rows);
  },

  // Batch update multiple rows by id (much faster than individual updates)
  updateBatch(sheetName, idUpdateMap) {
    const sh = getSheet(sheetName);
    const range = sh.getDataRange();
    const data = range.getValues();
    if (data.length <= 1) return;
    const headers = data[0];
    const idCol = headers.indexOf('id');
    let updated = false;
    for (let i = 1; i < data.length; i++) {
      const rowId = String(data[i][idCol]);
      if (idUpdateMap[rowId]) {
        const updates = idUpdateMap[rowId];
        headers.forEach((h, j) => {
          if (updates[h] !== undefined) {
            data[i][j] = updates[h];
            updated = true;
          }
        });
        const uaIdx = headers.indexOf('updatedAt');
        if (uaIdx >= 0) {
          data[i][uaIdx] = new Date().toISOString();
          updated = true;
        }
      }
    }
    if (updated) {
      range.setValues(data);
    }
  },
};

// ============================================================
// SETUP - Seed data awal (jalankan sekali dari menu GAS)
// ============================================================
function setupInitialData() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('SEEDED')) return 'Sudah di-seed sebelumnya.';

  // Ensure sheets exist
  Object.values(CONFIG.SHEET_NAMES).forEach(name => getSheet(name));

  // Users
  DB.insert('users', { id: 'u1', name: 'Administrator', email: 'admin@kasir.com', password: 'admin123', role: 'admin', avatar: '', createdAt: new Date().toISOString() });
  DB.insert('users', { id: 'u2', name: 'Budi Kasir', email: 'kasir@kasir.com', password: 'kasir123', role: 'kasir', avatar: '', createdAt: new Date().toISOString() });

  // Categories
  const cats = [
    { id:'c1', name:'Makanan', icon:'🍔', color:'#FF6584', status:'active' },
    { id:'c2', name:'Minuman', icon:'🥤', color:'#54A0FF', status:'active' },
    { id:'c3', name:'Snack',   icon:'🍿', color:'#FFB347', status:'active' },
    { id:'c4', name:'Elektronik', icon:'📱', color:'#6C63FF', status:'active' },
    { id:'c5', name:'Lain-lain', icon:'📦', color:'#00D9A3', status:'active' },
  ];
  cats.forEach(c => DB.insert('categories', c));

  // Products
  const prods = [
    { id:'p1',  name:'Nasi Goreng Spesial', sku:'MKN-001', barcode:'8991234560001', categoryId:'c1', price:25000, stock:50, photo:'', status:'active', createdAt: new Date().toISOString() },
    { id:'p2',  name:'Ayam Bakar',          sku:'MKN-002', barcode:'8991234560002', categoryId:'c1', price:35000, stock:30, photo:'', status:'active', createdAt: new Date().toISOString() },
    { id:'p3',  name:'Mie Goreng',           sku:'MKN-003', barcode:'8991234560003', categoryId:'c1', price:20000, stock:40, photo:'', status:'active', createdAt: new Date().toISOString() },
    { id:'p4',  name:'Soto Ayam',            sku:'MKN-004', barcode:'8991234560004', categoryId:'c1', price:22000, stock:25, photo:'', status:'active', createdAt: new Date().toISOString() },
    { id:'p5',  name:'Es Teh Manis',         sku:'MNM-001', barcode:'8991234560005', categoryId:'c2', price:8000,  stock:100,photo:'', status:'active', createdAt: new Date().toISOString() },
    { id:'p6',  name:'Jus Alpukat',          sku:'MNM-002', barcode:'8991234560006', categoryId:'c2', price:18000, stock:45, photo:'', status:'active', createdAt: new Date().toISOString() },
    { id:'p7',  name:'Air Mineral',          sku:'MNM-003', barcode:'8991234560007', categoryId:'c2', price:5000,  stock:200,photo:'', status:'active', createdAt: new Date().toISOString() },
    { id:'p8',  name:'Kopi Susu',            sku:'MNM-004', barcode:'8991234560008', categoryId:'c2', price:15000, stock:80, photo:'', status:'active', createdAt: new Date().toISOString() },
    { id:'p9',  name:'Keripik Singkong',     sku:'SNK-001', barcode:'8991234560009', categoryId:'c3', price:12000, stock:60, photo:'', status:'active', createdAt: new Date().toISOString() },
    { id:'p10', name:'Chitato BBQ',          sku:'SNK-002', barcode:'8991234560010', categoryId:'c3', price:9500,  stock:5,  photo:'', status:'active', createdAt: new Date().toISOString() },
    { id:'p11', name:'Oreo Original',        sku:'SNK-003', barcode:'8991234560011', categoryId:'c3', price:7500,  stock:55, photo:'', status:'active', createdAt: new Date().toISOString() },
    { id:'p12', name:'Kabel USB-C',          sku:'ELK-001', barcode:'8991234560012', categoryId:'c4', price:45000, stock:20, photo:'', status:'active', createdAt: new Date().toISOString() },
    { id:'p13', name:'Power Bank 10000mAh',  sku:'ELK-002', barcode:'8991234560013', categoryId:'c4', price:150000,stock:10, photo:'', status:'active', createdAt: new Date().toISOString() },
    { id:'p14', name:'Sabun Mandi',          sku:'LLN-001', barcode:'8991234560014', categoryId:'c5', price:6000,  stock:0,  photo:'', status:'active', createdAt: new Date().toISOString() },
    { id:'p15', name:'Tisu Wajah',           sku:'LLN-002', barcode:'8991234560015', categoryId:'c5', price:14000, stock:35, photo:'', status:'active', createdAt: new Date().toISOString() },
  ];
  prods.forEach(p => DB.insert('products', p));

  // Customers
  const custs = [
    { id:'cust1', name:'Andi Wijaya',       phone:'081234567890', isMember:true,  totalSpend:450000,  createdAt: new Date().toISOString() },
    { id:'cust2', name:'Siti Rahayu',       phone:'082345678901', isMember:true,  totalSpend:1250000, createdAt: new Date().toISOString() },
    { id:'cust3', name:'Budi Santoso',      phone:'083456789012', isMember:false, totalSpend:180000,  createdAt: new Date().toISOString() },
    { id:'cust4', name:'Dewi Kartika',      phone:'084567890123', isMember:true,  totalSpend:980000,  createdAt: new Date().toISOString() },
    { id:'cust5', name:'Reza Firmansyah',   phone:'085678901234', isMember:false, totalSpend:320000,  createdAt: new Date().toISOString() },
  ];
  custs.forEach(c => DB.insert('customers', c));

  // Settings
  Object.entries(CONFIG.DEFAULT_SETTINGS).forEach(([k,v]) => DB.setSetting(k, v));

  // Notifications seed
  DB.insert('notifications', { id:'n1', type:'warning', title:'Stok Menipis', message:'Chitato BBQ tersisa 5 item', isRead:'false', createdAt: new Date().toISOString() });
  DB.insert('notifications', { id:'n2', type:'danger',  title:'Stok Habis',   message:'Sabun Mandi sudah habis',   isRead:'false', createdAt: new Date().toISOString() });

  // Demo transactions (3 hari terakhir)
  const methods = ['tunai','qris','debit'];
  for (let d = 2; d >= 0; d--) {
    const txDate = new Date();
    txDate.setDate(txDate.getDate() - d);
    for (let t = 0; t < 3; t++) {
      txDate.setHours(8 + t * 3, 30);
      const tid = DB.generateId();
      const pad = n => String(n).padStart(2,'0');
      const inv = `INV-${txDate.getFullYear()}${pad(txDate.getMonth()+1)}${pad(txDate.getDate())}-${String(t+1).padStart(4,'0')}`;
      const sub = 25000 + 8000;
      const tax = Math.round(sub * 0.1);
      DB.insert('transactions', { id:tid, invoice:inv, kasirId:'u2', customerId:'', subtotal:sub, discount:0, tax:tax, total:sub+tax, paymentMethod:methods[t%3], cashPaid:sub+tax, change:0, status:'completed', shiftId:'', createdAt:txDate.toISOString() });
      DB.insert('transaction_items', { id:DB.generateId(), transactionId:tid, productId:'p1', name:'Nasi Goreng Spesial', price:25000, qty:1, discount:0, note:'' });
      DB.insert('transaction_items', { id:DB.generateId(), transactionId:tid, productId:'p5', name:'Es Teh Manis',        price:8000,  qty:1, discount:0, note:'' });
    }
  }

  props.setProperty('SEEDED', 'true');
  return 'Setup selesai! Spreadsheet ID: ' + getSpreadsheet().getId();
}

// Fix existing settings yang tidak punya ID (run once if needed)
function fixExistingSettings() {
  const sh = getSheet(CONFIG.SHEET_NAMES.SETTINGS);
  const data = sh.getDataRange().getValues();
  if (data.length <= 1) return 'No settings to fix.';
  
  const headers = data[0];
  const idCol = headers.indexOf('id');
  const keyCol = headers.indexOf('key');
  
  let fixed = 0;
  for (let i = 1; i < data.length; i++) {
    // If id is empty, generate one
    if (!data[i][idCol] || String(data[i][idCol]).trim() === '') {
      const newId = DB.generateId();
      sh.getRange(i + 1, idCol + 1).setValue(newId);
      fixed++;
    }
  }
  
  return `Fixed ${fixed} settings rows without ID.`;
}

// Tambahkan menu di Spreadsheet (opsional)
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Kasir')
    .addItem('Setup Data Awal', 'setupInitialData')
    .addItem('Fix Settings (Jika Settings Tidak Tersimpan)', 'fixExistingSettings')
    .addToUi();
}


// ========================================== 
// Section: Auth.gs 
// ========================================== 

// ============================================================
// Auth.gs - Autentikasi & Session
// ============================================================

function login(email, password, remember) {
  const users = DB.getAll(CONFIG.SHEET_NAMES.USERS);
  const user = users.find(u =>
    (u.email.toLowerCase() === email.toLowerCase() || u.name.toLowerCase() === email.toLowerCase()) &&
    u.password === password
  );
  if (!user) return { success: false, message: 'Email/username atau password salah.' };

  // Simpan session di UserProperties
  const props = PropertiesService.getUserProperties();
  const session = { userId: user.id, role: user.role, name: user.name, loginAt: new Date().toISOString() };
  props.setProperty('session', JSON.stringify(session));
  if (remember) props.setProperty('remember', JSON.stringify(session));

  return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } };
}

function logout() {
  const props = PropertiesService.getUserProperties();
  props.deleteProperty('session');
  props.deleteProperty('remember');
  return { success: true };
}

function getSession() {
  const props = PropertiesService.getUserProperties();
  let session = null;
  try { session = JSON.parse(props.getProperty('session')); } catch(e){}
  if (!session) {
    try { session = JSON.parse(props.getProperty('remember')); } catch(e){}
  }
  return session;
}

function getCurrentUser() {
  const session = getSession();
  if (!session) return null;
  const u = DB.getById(CONFIG.SHEET_NAMES.USERS, session.userId);
  if (!u) return null;
  return { id: u.id, name: u.name, email: u.email, role: u.role, avatar: u.avatar };
}

function checkSession() {
  const user = getCurrentUser();
  return { loggedIn: !!user, user };
}

function changePassword(oldPass, newPass) {
  const user = getCurrentUser();
  if (!user) return { success: false, message: 'Sesi tidak valid.' };
  const full = DB.getById(CONFIG.SHEET_NAMES.USERS, user.id);
  if (!full || full.password !== oldPass) return { success: false, message: 'Password lama salah.' };
  DB.update(CONFIG.SHEET_NAMES.USERS, user.id, { password: newPass });
  return { success: true };
}

function updateProfile(data) {
  const user = getCurrentUser();
  if (!user) return { success: false, message: 'Sesi tidak valid.' };
  DB.update(CONFIG.SHEET_NAMES.USERS, user.id, { name: data.name, avatar: data.avatar || '' });
  // Update session
  const props = PropertiesService.getUserProperties();
  const session = JSON.parse(props.getProperty('session') || '{}');
  session.name = data.name;
  props.setProperty('session', JSON.stringify(session));
  return { success: true };
}

function forgotPassword(email) {
  const users = DB.getAll(CONFIG.SHEET_NAMES.USERS);
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return { success: false, message: 'Email tidak ditemukan.' };
  return { success: true, password: user.password, name: user.name };
}

// ===== USER MANAGEMENT (Admin Only) =====
function getAllUsers() {
  const session = getSession();
  if (!session || session.role !== 'admin') return [];
  return DB.getAll(CONFIG.SHEET_NAMES.USERS).map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    avatar: u.avatar || '',
    createdAt: u.createdAt
  }));
}

function saveUser(data) {
  const session = getSession();
  if (!session || session.role !== 'admin') {
    return { success: false, message: 'Hanya admin yang dapat mengelola user.' };
  }
  
  const users = DB.getAll(CONFIG.SHEET_NAMES.USERS);
  
  // Validasi email/username unique
  const existingUser = users.find(u => 
    u.email.toLowerCase() === data.email.toLowerCase() && u.id !== data.id
  );
  if (existingUser) {
    return { success: false, message: 'Email/username sudah digunakan oleh user lain.' };
  }
  
  if (data.id) {
    // Update existing user
    const updateData = {
      name: data.name,
      email: data.email,
      role: data.role
    };
    // Only update password if provided
    if (data.password) {
      updateData.password = data.password;
    }
    DB.update(CONFIG.SHEET_NAMES.USERS, data.id, updateData);
    return { success: true, message: 'User berhasil diperbarui.' };
  } else {
    // Create new user
    if (!data.password || data.password.length < 6) {
      return { success: false, message: 'Password minimal 6 karakter.' };
    }
    const newUser = {
      id: DB.generateId(),
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role,
      avatar: '',
      createdAt: new Date().toISOString()
    };
    DB.insert(CONFIG.SHEET_NAMES.USERS, newUser);
    return { success: true, message: 'User baru berhasil ditambahkan.' };
  }
}

function deleteUser(id) {
  const session = getSession();
  if (!session || session.role !== 'admin') {
    return { success: false, message: 'Hanya admin yang dapat menghapus user.' };
  }
  
  // Prevent deleting self
  if (id === session.userId) {
    return { success: false, message: 'Anda tidak dapat menghapus akun Anda sendiri.' };
  }
  
  // Check if user has active shifts
  const shifts = DB.filter(CONFIG.SHEET_NAMES.SHIFTS, s => s.kasirId === id && s.status === 'open');
  if (shifts.length > 0) {
    return { success: false, message: 'User memiliki shift aktif. Tutup shift terlebih dahulu.' };
  }
  
  DB.delete(CONFIG.SHEET_NAMES.USERS, id);
  return { success: true, message: 'User berhasil dihapus.' };
}


// ========================================== 
// Section: Services.gs 
// ========================================== 

// ============================================================
// Services.gs - Business Logic (Products, Transactions, Reports, dll)
// ============================================================

// ===== PRODUCTS =====
function getProducts(filter) {
  let prods = DB.getAll(CONFIG.SHEET_NAMES.PRODUCTS);
  const cats = DB.getAll(CONFIG.SHEET_NAMES.CATEGORIES);
  if (filter && filter.categoryId) prods = prods.filter(p => p.categoryId === filter.categoryId);
  if (filter && filter.search) {
    const q = filter.search.toLowerCase();
    // Bug #4 fix: barcode juga pakai toLowerCase()
    prods = prods.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || String(p.barcode).toLowerCase().includes(q));
  }
  if (filter && filter.status) prods = prods.filter(p => p.status === filter.status);
  return prods.map(p => ({ ...p, category: cats.find(c => c.id === p.categoryId) || null }));
}

function getProductByBarcode(barcode) {
  const prods = DB.getAll(CONFIG.SHEET_NAMES.PRODUCTS);
  return prods.find(p => String(p.barcode) === String(barcode)) || null;
}

function saveProduct(data) {
  if (data.id) {
    DB.update(CONFIG.SHEET_NAMES.PRODUCTS, data.id, data);
    return { success: true, message: 'Produk berhasil diperbarui.' };
  }
  const prod = { ...data, id: DB.generateId(), createdAt: new Date().toISOString() };
  DB.insert(CONFIG.SHEET_NAMES.PRODUCTS, prod);
  return { success: true, message: 'Produk berhasil ditambahkan.' };
}

function deleteProduct(id) {
  DB.delete(CONFIG.SHEET_NAMES.PRODUCTS, id);
  return { success: true };
}

// ===== CATEGORIES =====
function getCategories() { return DB.getAll(CONFIG.SHEET_NAMES.CATEGORIES); }

function saveCategory(data) {
  if (data.id) {
    DB.update(CONFIG.SHEET_NAMES.CATEGORIES, data.id, data);
    return { success: true, message: 'Kategori diperbarui.' };
  }
  DB.insert(CONFIG.SHEET_NAMES.CATEGORIES, { ...data, id: DB.generateId() });
  return { success: true, message: 'Kategori ditambahkan.' };
}

function deleteCategory(id) {
  DB.delete(CONFIG.SHEET_NAMES.CATEGORIES, id);
  return { success: true };
}

// ===== CUSTOMERS =====
function getCustomers(search) {
  let custs = DB.getAll(CONFIG.SHEET_NAMES.CUSTOMERS);
  if (search) { const q = search.toLowerCase(); custs = custs.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q)); }
  return custs;
}

function saveCustomer(data) {
  if (data.id) {
    DB.update(CONFIG.SHEET_NAMES.CUSTOMERS, data.id, data);
    return { success: true };
  }
  DB.insert(CONFIG.SHEET_NAMES.CUSTOMERS, { ...data, id: DB.generateId(), totalSpend: 0, createdAt: new Date().toISOString() });
  return { success: true };
}

function deleteCustomer(id) {
  DB.delete(CONFIG.SHEET_NAMES.CUSTOMERS, id);
  return { success: true };
}

// ===== TRANSACTIONS =====
function createTransaction(data) {
  try {
    const session = getSession();
    if (!session) return { success: false, message: 'Sesi tidak valid, silakan login ulang.' };

    // Bug #5 fix: Validasi shift aktif
    const activeShift = DB.filter(CONFIG.SHEET_NAMES.SHIFTS, s =>
      s.kasirId === session.userId && s.status === 'open'
    );
    if (activeShift.length === 0) {
      return { success: false, message: 'Tidak ada shift aktif. Silakan buka shift terlebih dahulu.' };
    }
    data.shiftId = activeShift[0].id;

    // Load all products in memory to avoid multiple sheet reads in loop
    const productsList = DB.getAll(CONFIG.SHEET_NAMES.PRODUCTS);
    const productsMap = {};
    productsList.forEach(p => {
      productsMap[p.id] = p;
    });

    // Bug #6 fix: Validasi stok cukup sebelum proses
    for (const item of data.items) {
      const prod = productsMap[item.productId];
      if (!prod) {
        return { success: false, message: `Produk ${item.name} tidak ditemukan.` };
      }
      if (parseInt(prod.stock) < parseInt(item.qty)) {
        return { success: false, message: `Stok ${prod.name} tidak cukup. Tersedia: ${prod.stock}, diminta: ${item.qty}` };
      }
    }

    const txId = DB.generateId();
    const invoice = DB.generateInvoice();
    const now = new Date().toISOString();

    // Hitung total
    const subtotal = data.items.reduce((s, i) => s + (i.price * i.qty) - (i.discount || 0), 0);
    const settings = DB.getAllSettings();
    const taxRate = parseFloat(settings.taxRate) || 0; // Bug #8 fix: fallback 0 jika NaN
    const tax = data.includeTax ? Math.round(subtotal * taxRate / 100) : 0;
    const total = subtotal - (data.discount || 0) + tax;

    // Bug #7 fix: Validasi pembayaran tunai cukup
    if (data.paymentMethod === 'tunai') {
      const cashPaid = parseFloat(data.cashPaid) || 0;
      if (cashPaid < total) {
        return { success: false, message: `Pembayaran tunai tidak cukup. Total: ${total}, dibayar: ${cashPaid}` };
      }
    }

    const tx = {
      id: txId, invoice, kasirId: session.userId, customerId: data.customerId || '',
      subtotal, discount: data.discount || 0, tax, total,
      paymentMethod: data.paymentMethod, cashPaid: data.cashPaid || total,
      change: Math.max(0, (data.cashPaid || total) - total),
      status: 'completed', shiftId: data.shiftId || '', createdAt: now,
    };
    DB.insert(CONFIG.SHEET_NAMES.TRANSACTIONS, tx);

    const txItemsToInsert = [];
    const productStockUpdates = {};
    const notificationsToInsert = [];

    // Load active notifications in memory for duplicate checking
    const unreadNotifications = DB.filter(CONFIG.SHEET_NAMES.NOTIFICATIONS, n => n.isRead === 'false' || n.isRead === false);

    // Process items
    data.items.forEach(item => {
      txItemsToInsert.push({
        id: DB.generateId(),
        transactionId: txId,
        productId: item.productId,
        name: item.name,
        price: item.price,
        qty: item.qty,
        discount: item.discount || 0,
        note: item.note || '',
      });

      // Kurangi stok
      const prod = productsMap[item.productId];
      if (prod) {
        const newStock = Math.max(0, parseInt(prod.stock) - parseInt(item.qty));
        productStockUpdates[item.productId] = { stock: newStock };

        // Bug #2 fix: Notif stok dengan deduplication (cek dulu di memori sebelum insert)
        if (newStock === 0) {
          const existing = unreadNotifications.find(n =>
            n.type === 'danger' && n.message.includes(prod.name)
          );
          if (!existing) {
            notificationsToInsert.push({ id: DB.generateId(), type:'danger', title:'Stok Habis', message:`${prod.name} sudah habis`, isRead:'false', createdAt: now });
          }
        } else if (newStock <= CONFIG.LOW_STOCK_THRESHOLD) {
          const existing = unreadNotifications.find(n =>
            n.type === 'warning' && n.message.includes(prod.name)
          );
          if (!existing) {
            notificationsToInsert.push({ id: DB.generateId(), type:'warning', title:'Stok Menipis', message:`${prod.name} tersisa ${newStock} item`, isRead:'false', createdAt: now });
          }
        }
      }
    });

    // Batch insert transaction items
    if (txItemsToInsert.length > 0) {
      DB.insertBatch(CONFIG.SHEET_NAMES.TX_ITEMS, txItemsToInsert);
    }

    // Batch update product stock
    if (Object.keys(productStockUpdates).length > 0) {
      DB.updateBatch(CONFIG.SHEET_NAMES.PRODUCTS, productStockUpdates);
    }

    // Batch insert notifications
    if (notificationsToInsert.length > 0) {
      DB.insertBatch(CONFIG.SHEET_NAMES.NOTIFICATIONS, notificationsToInsert);
    }

    // Update total belanja customer
    if (data.customerId) {
      const cust = DB.getById(CONFIG.SHEET_NAMES.CUSTOMERS, data.customerId);
      if (cust) DB.update(CONFIG.SHEET_NAMES.CUSTOMERS, data.customerId, { totalSpend: (parseFloat(cust.totalSpend) || 0) + total });
    }

    // Update shift jika ada
    if (data.shiftId) {
      const shift = DB.getById(CONFIG.SHEET_NAMES.SHIFTS, data.shiftId);
      if (shift) {
        DB.update(CONFIG.SHEET_NAMES.SHIFTS, data.shiftId, {
          totalSales: (parseFloat(shift.totalSales) || 0) + total,
          txCount: (parseInt(shift.txCount) || 0) + 1,
        });
      }
    }

    return { success: true, transaction: tx };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function getTransactions(filter) {
  let txs = DB.getAll(CONFIG.SHEET_NAMES.TRANSACTIONS);
  const users = DB.getAll(CONFIG.SHEET_NAMES.USERS);
  const customers = DB.getAll(CONFIG.SHEET_NAMES.CUSTOMERS);

  if (filter) {
    if (filter.search) { const q = filter.search.toLowerCase(); txs = txs.filter(t => t.invoice.toLowerCase().includes(q)); }
    if (filter.paymentMethod) txs = txs.filter(t => t.paymentMethod === filter.paymentMethod);
    if (filter.status) txs = txs.filter(t => t.status === filter.status);
    if (filter.startDate) txs = txs.filter(t => new Date(t.createdAt) >= new Date(filter.startDate));
    if (filter.endDate) { const end = new Date(filter.endDate); end.setHours(23,59,59); txs = txs.filter(t => new Date(t.createdAt) <= end); }
    if (filter.kasirId) txs = txs.filter(t => t.kasirId === filter.kasirId);
  }

  return txs.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).map(t => ({
    ...t,
    kasirName: (users.find(u => u.id === t.kasirId) || {}).name || '-',
    customerName: t.customerId ? (customers.find(c => c.id === t.customerId) || {}).name || '-' : '-',
  }));
}

function getTransactionDetail(txId) {
  const tx = DB.getById(CONFIG.SHEET_NAMES.TRANSACTIONS, txId);
  if (!tx) return null;
  const items = DB.filter(CONFIG.SHEET_NAMES.TX_ITEMS, i => i.transactionId === txId);
  const kasir = DB.getById(CONFIG.SHEET_NAMES.USERS, tx.kasirId);
  const customer = tx.customerId ? DB.getById(CONFIG.SHEET_NAMES.CUSTOMERS, tx.customerId) : null;
  return { ...tx, items, kasirName: kasir ? kasir.name : '-', customerName: customer ? customer.name : '-' };
}

function voidTransaction(txId) {
  const session = getSession();
  if (!session || session.role !== 'admin') return { success: false, message: 'Hanya Admin yang bisa void transaksi.' };
  DB.update(CONFIG.SHEET_NAMES.TRANSACTIONS, txId, { status: 'void' });
  return { success: true };
}

function refundTransaction(txId) {
  const session = getSession();
  if (!session || session.role !== 'admin') return { success: false, message: 'Hanya Admin yang bisa refund.' };
  DB.update(CONFIG.SHEET_NAMES.TRANSACTIONS, txId, { status: 'refund' });
  return { success: true };
}

// ===== SHIFT =====
function openShift(modalAwal) {
  const session = getSession();
  if (!session) return { success: false, message: 'Sesi tidak valid.' };
  const existing = DB.filter(CONFIG.SHEET_NAMES.SHIFTS, s => s.kasirId === session.userId && s.status === 'open');
  if (existing.length) return { success: false, message: 'Shift masih terbuka. Tutup shift dulu.', shift: existing[0] };
  const shift = { id: DB.generateId(), kasirId: session.userId, openTime: new Date().toISOString(), closeTime:'', modalAwal: parseFloat(modalAwal)||0, totalSales:0, txCount:0, kasNote:'', status:'open' };
  DB.insert(CONFIG.SHEET_NAMES.SHIFTS, shift);
  return { success: true, shift };
}

function closeShift(shiftId, kasNote) {
  const shift = DB.getById(CONFIG.SHEET_NAMES.SHIFTS, shiftId);
  if (!shift) return { success: false, message: 'Shift tidak ditemukan.' };
  DB.update(CONFIG.SHEET_NAMES.SHIFTS, shiftId, { closeTime: new Date().toISOString(), kasNote: kasNote||'', status:'closed' });
  return { success: true };
}

function getActiveShift() {
  const session = getSession();
  if (!session) return null;
  const shifts = DB.filter(CONFIG.SHEET_NAMES.SHIFTS, s => s.kasirId === session.userId && s.status === 'open');
  return shifts[0] || null;
}

function getShifts() {
  const shifts = DB.getAll(CONFIG.SHEET_NAMES.SHIFTS);
  const users = DB.getAll(CONFIG.SHEET_NAMES.USERS);
  return shifts.sort((a,b) => new Date(b.openTime) - new Date(a.openTime))
    .map(s => ({ ...s, kasirName: (users.find(u => u.id === s.kasirId)||{}).name||'-' }));
}

// ===== LAPORAN =====
function getReport(type, startDate, endDate) {
  const start = startDate ? new Date(startDate) : (() => { const d=new Date(); d.setDate(1); d.setHours(0,0,0,0); return d; })();
  const end   = endDate   ? (() => { const d=new Date(endDate); d.setHours(23,59,59,999); return d; })()
                           : (() => { const d=new Date(); d.setHours(23,59,59,999); return d; })();

  const txs = DB.getAll(CONFIG.SHEET_NAMES.TRANSACTIONS)
    .filter(t => t.status === 'completed' && new Date(t.createdAt) >= start && new Date(t.createdAt) <= end);

  const totalRevenue = txs.reduce((s,t) => s + parseFloat(t.total||0), 0);
  const totalTx = txs.length;

  // Produk terlaris
  const items = DB.getAll(CONFIG.SHEET_NAMES.TX_ITEMS)
    .filter(i => txs.find(t => t.id === i.transactionId));
  const prodSales = {};
  items.forEach(i => {
    if (!prodSales[i.name]) prodSales[i.name] = { name: i.name, qty: 0, revenue: 0 };
    prodSales[i.name].qty += parseInt(i.qty||0);
    prodSales[i.name].revenue += parseInt(i.qty||0) * parseFloat(i.price||0);
  });
  const topProducts = Object.values(prodSales).sort((a,b) => b.qty - a.qty).slice(0, 10);

  // By payment method
  const byMethod = {};
  txs.forEach(t => { byMethod[t.paymentMethod] = (byMethod[t.paymentMethod]||0) + parseFloat(t.total||0); });

  // Daily breakdown
  const byDay = {};
  txs.forEach(t => {
    const d = new Date(t.createdAt).toISOString().split('T')[0];
    if (!byDay[d]) byDay[d] = { date: d, total: 0, count: 0 };
    byDay[d].total += parseFloat(t.total||0);
    byDay[d].count++;
  });
  const dailyData = Object.values(byDay).sort((a,b) => a.date.localeCompare(b.date));

  return { totalRevenue, totalTx, topProducts, byMethod, dailyData, transactions: txs };
}

// ===== DASHBOARD =====
function getDashboardData() {
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
  const allTx = DB.getAll(CONFIG.SHEET_NAMES.TRANSACTIONS);
  const todayTx = allTx.filter(t => { const d=new Date(t.createdAt); return d>=today && d<tomorrow && t.status==='completed'; });
  const todayItems = DB.getAll(CONFIG.SHEET_NAMES.TX_ITEMS).filter(i => todayTx.find(t => t.id===i.transactionId));

  const recentTx = [...allTx].sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt)).slice(0,5);
  const users = DB.getAll(CONFIG.SHEET_NAMES.USERS);
  const recentWithKasir = recentTx.map(t => ({ ...t, kasirName: (users.find(u=>u.id===t.kasirId)||{}).name||'-' }));

  // 7-day chart
  const chartData = [];
  for (let i=6; i>=0; i--) {
    const d = new Date(); d.setDate(d.getDate()-i); d.setHours(0,0,0,0);
    const nd = new Date(d); nd.setDate(nd.getDate()+1);
    const dayTx = allTx.filter(t => { const td=new Date(t.createdAt); return td>=d && td<nd && t.status==='completed'; });
    chartData.push({ date: d.toISOString().split('T')[0], total: dayTx.reduce((s,t)=>s+parseFloat(t.total||0),0), count: dayTx.length });
  }

  // Top products
  const items = DB.getAll(CONFIG.SHEET_NAMES.TX_ITEMS);
  const prodSales = {};
  items.forEach(i => {
    if (!prodSales[i.name]) prodSales[i.name] = { name:i.name, qty:0 };
    prodSales[i.name].qty += parseInt(i.qty||0);
  });
  const topProducts = Object.values(prodSales).sort((a,b)=>b.qty-a.qty).slice(0,5);

  // Low stock
  const lowStock = DB.getAll(CONFIG.SHEET_NAMES.PRODUCTS).filter(p => parseInt(p.stock||0) <= CONFIG.LOW_STOCK_THRESHOLD);

  return {
    todayRevenue: todayTx.reduce((s,t)=>s+parseFloat(t.total||0),0),
    todayTxCount: todayTx.length,
    todayItemsSold: todayItems.reduce((s,i)=>s+parseInt(i.qty||0),0),
    totalTxAll: allTx.length,
    recentTransactions: recentWithKasir,
    chartData, topProducts, lowStock,
  };
}

// ===== SETTINGS =====
function getSettings() { return DB.getAllSettings(); }

function saveSettings(data) {
  Object.entries(data).forEach(([k,v]) => DB.setSetting(k, v));
  return { success: true };
}

// ===== NOTIFICATIONS =====
function getNotifications() {
  return DB.getAll(CONFIG.SHEET_NAMES.NOTIFICATIONS)
    .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function markNotifRead(id) {
  DB.update(CONFIG.SHEET_NAMES.NOTIFICATIONS, id, { isRead: 'true' });
  return { success: true };
}

function markAllNotifsRead() {
  const notifs = DB.getAll(CONFIG.SHEET_NAMES.NOTIFICATIONS);
  notifs.filter(n => n.isRead === 'false' || n.isRead === false).forEach(n => {
    DB.update(CONFIG.SHEET_NAMES.NOTIFICATIONS, n.id, { isRead: 'true' });
  });
  return { success: true };
}

function deleteNotif(id) {
  DB.delete(CONFIG.SHEET_NAMES.NOTIFICATIONS, id);
  return { success: true };
}

function getUnreadNotifCount() {
  return DB.getAll(CONFIG.SHEET_NAMES.NOTIFICATIONS).filter(n => n.isRead === 'false' || n.isRead === false).length;
}

// ===== INITIAL DATA (Combined fetch untuk mempercepat loading) =====
function getInitialData() {
  try {
    const auth = checkSession();
    if (!auth.loggedIn) return { loggedIn: false };

    var settings = {};
    var categories = [];
    var activeShift = null;
    var notifications = [];

    try { settings = getSettings(); } catch(e) { Logger.log('getSettings error: ' + e); }
    try { categories = getCategories(); } catch(e) { Logger.log('getCategories error: ' + e); }
    try { activeShift = getActiveShift(); } catch(e) { Logger.log('getActiveShift error: ' + e); }
    try { notifications = getNotifications(); } catch(e) { Logger.log('getNotifications error: ' + e); }

    return {
      loggedIn: true,
      user: auth.user,
      settings: settings,
      categories: categories,
      activeShift: activeShift,
      notifications: notifications
    };
  } catch(e) {
    Logger.log('getInitialData critical error: ' + e);
    return { loggedIn: false, error: e.message };
  }
}

// ===== USER MANAGEMENT (Admin) =====
function getUsers() {
  const session = getSession();
  if (!session || session.role !== 'admin') return [];
  return DB.getAll(CONFIG.SHEET_NAMES.USERS).map(u => ({ ...u, password: '***' }));
}

// ===== UTILITY FUNCTIONS (Admin) =====
function clearTransactionsAndShifts() {
  const session = getSession();
  if (!session || session.role !== 'admin') return { success: false, message: 'Hanya Admin yang dapat menghapus data.' };
  
  // Hapus semua transaksi dan shift
  const ss = getSpreadsheet();
  const txSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.TRANSACTIONS);
  const txItemsSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.TX_ITEMS);
  const shiftsSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SHIFTS);
  
  if (txSheet) txSheet.getRange(2, 1, txSheet.getLastRow() - 1, txSheet.getLastColumn()).clearContent();
  if (txItemsSheet) txItemsSheet.getRange(2, 1, txItemsSheet.getLastRow() - 1, txItemsSheet.getLastColumn()).clearContent();
  if (shiftsSheet) shiftsSheet.getRange(2, 1, shiftsSheet.getLastRow() - 1, shiftsSheet.getLastColumn()).clearContent();
  
  return { success: true, message: 'Data transaksi dan shift berhasil dihapus.' };
}


// ========================================== 
// Section: Entrypoint (doGet)
// ========================================== 

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Aplikasi Kasir')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}
