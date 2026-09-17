/**
 * LogicLaundry — Backend Google Apps Script
 * ------------------------------------------------------------
 * Skrip ini mengubah satu Google Spreadsheet menjadi "database"
 * untuk aplikasi LogicLaundry, diakses lewat Web App (JSON API).
 *
 * CARA PASANG:
 * 1. Buat Google Spreadsheet baru (kosong), beri nama mis. "LogicLaundry DB".
 * 2. Buka menu Extensions/Ekstensi → Apps Script.
 * 3. Hapus isi Code.gs bawaan, tempel SELURUH isi file ini.
 * 4. Ganti nilai API_KEY di bawah dengan kata sandi rahasia buatanmu sendiri.
 * 5. Di dropdown fungsi (atas), pilih "setupSheets", klik Run (▶).
 *    - Saat pertama kali klik Run, Google akan minta izin akses — klik
 *      "Review permissions" → pilih akun → "Advanced" → "Go to project (unsafe)"
 *      → Allow. Ini normal karena skrip ini milikmu sendiri.
 *    - Fungsi ini akan membuat sheet Pelanggan, Layanan, Pesanan, Pengaturan
 *      beserta data contoh.
 * 6. Klik Deploy → New deployment → pilih tipe "Web app".
 *    - Execute as: Me
 *    - Who has access: Anyone
 *    - Klik Deploy, salin "Web app URL" yang muncul.
 * 7. Tempel Web app URL + API key tadi ke halaman Pengaturan aplikasi
 *    LogicLaundry (bagian "Koneksi Google Sheets").
 *
 * Catatan: setiap kali kode ini diedit, buat "New deployment" lagi (atau
 * Manage deployments → Edit → New version) supaya perubahan aktif di URL.
 */

// ============ KONFIGURASI ============
var API_KEY = 'ganti-dengan-kata-sandi-rahasiamu'; // WAJIB diganti sebelum deploy!

var SHEET_CUSTOMERS = 'Pelanggan';
var SHEET_SERVICES = 'Layanan';
var SHEET_ORDERS = 'Pesanan';
var SHEET_SETTINGS = 'Pengaturan';

var CUSTOMER_HEADERS = ['ID', 'Nama', 'Telepon', 'Alamat', 'Tingkat', 'Poin', 'TanggalGabung'];
var SERVICE_HEADERS = ['ID', 'Nama', 'Kategori', 'Harga', 'Satuan', 'EstimasiJam'];
var ORDER_HEADERS = ['ID', 'PelangganID', 'ItemsJSON', 'Total', 'Status', 'StatusBayar', 'TanggalMasuk', 'EstimasiSelesai', 'Catatan'];

// ============ ENTRY POINTS (Web App) ============

function doGet(e) {
  try {
    var action = e.parameter.action || 'getAll';
    if (e.parameter.key !== API_KEY) return jsonOutput({ ok: false, error: 'API key tidak valid.' });
    if (action === 'getAll') return jsonOutput({ ok: true, data: getAllData() });
    return jsonOutput({ ok: false, error: 'Aksi tidak dikenal untuk GET: ' + action });
  } catch (err) {
    return jsonOutput({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents || '{}');
    if (body.apiKey !== API_KEY) return jsonOutput({ ok: false, error: 'API key tidak valid.' });

    var action = body.action;
    var payload = body.payload || {};
    var result;

    switch (action) {
      case 'getAll': result = getAllData(); break;
      case 'saveCustomer': result = upsertRow(SHEET_CUSTOMERS, CUSTOMER_HEADERS, normalizeCustomer(payload)); break;
      case 'deleteCustomer': result = deleteRow(SHEET_CUSTOMERS, payload.id); break;
      case 'saveService': result = upsertRow(SHEET_SERVICES, SERVICE_HEADERS, normalizeService(payload)); break;
      case 'deleteService': result = deleteRow(SHEET_SERVICES, payload.id); break;
      case 'saveOrder': result = upsertRow(SHEET_ORDERS, ORDER_HEADERS, normalizeOrder(payload)); break;
      case 'deleteOrder': result = deleteRow(SHEET_ORDERS, payload.id); break;
      case 'saveSettings': result = saveSettings(payload); break;
      default: return jsonOutput({ ok: false, error: 'Aksi tidak dikenal: ' + action });
    }

    return jsonOutput({ ok: true, data: result, all: getAllData() });
  } catch (err) {
    return jsonOutput({ ok: false, error: String(err) });
  }
}

// ============ SETUP (jalankan sekali secara manual) ============

function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  ensureSheet_(ss, SHEET_CUSTOMERS, CUSTOMER_HEADERS);
  ensureSheet_(ss, SHEET_SERVICES, SERVICE_HEADERS);
  ensureSheet_(ss, SHEET_ORDERS, ORDER_HEADERS);

  var settingsSheet = ensureSheet_(ss, SHEET_SETTINGS, ['Key', 'Value']);

  if (settingsSheet.getLastRow() < 2) {
    var defaults = [
      ['storeName', 'LogicLaundry'],
      ['tagline', 'Bersih, Cepat & Terpercaya'],
      ['address', 'Jl. Melong Raya No. 88, Cimahi, Jawa Barat'],
      ['phone', '0822-1111-2222'],
      ['email', 'halo@logiclaundry.id'],
      ['currency', 'IDR'],
      ['waTemplate', 'Halo {nama}, pesanan {invoice} Anda berstatus *{status}*. Total tagihan: {total}. Terima kasih telah mempercayai LogicLaundry! 🧺'],
      ['invoiceFooter', 'Terima kasih telah menggunakan jasa LogicLaundry. Simpan struk ini sebagai bukti pengambilan.'],
      ['pointsPerRupiah', '10000'],
    ];
    settingsSheet.getRange(2, 1, defaults.length, 2).setValues(defaults);
  }

  var servicesSheet = ss.getSheetByName(SHEET_SERVICES);
  if (servicesSheet.getLastRow() < 2) {
    var svc = [
      ['SVC-001', 'Cuci Kering Lipat', 'Reguler', 7000, 'kg', 24],
      ['SVC-002', 'Cuci Setrika', 'Reguler', 9000, 'kg', 24],
      ['SVC-003', 'Setrika Saja', 'Reguler', 5000, 'kg', 12],
      ['SVC-004', 'Express 6 Jam', 'Express', 15000, 'kg', 6],
      ['SVC-005', 'Cuci Sepatu', 'Satuan', 25000, 'pasang', 48],
      ['SVC-006', 'Cuci Selimut/Bed Cover', 'Satuan', 30000, 'pcs', 48],
      ['SVC-007', 'Dry Cleaning Jas/Gaun', 'Satuan', 35000, 'pcs', 72],
    ];
    servicesSheet.getRange(2, 1, svc.length, svc[0].length).setValues(svc);
  }

  var custSheet = ss.getSheetByName(SHEET_CUSTOMERS);
  if (custSheet.getLastRow() < 2) {
    var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT+7', 'yyyy-MM-dd');
    var cust = [
      ['CUST-001', 'Siti Amara', '081234567801', 'Jl. Merdeka No. 12, Bandung', 'VIP', 420, today],
      ['CUST-002', 'Budi Santoso', '081234567802', 'Jl. Dago No. 45, Bandung', 'Reguler', 60, today],
    ];
    custSheet.getRange(2, 1, cust.length, cust[0].length).setValues(cust);
  }

  SpreadsheetApp.getUi() && SpreadsheetApp.getUi().alert('Setup selesai! Sheet Pelanggan, Layanan, Pesanan, dan Pengaturan sudah siap.');
}

function ensureSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ============ HELPERS: CRUD generik berbasis kolom "ID" ============

function getSheet_(name) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error('Sheet "' + name + '" belum ada. Jalankan fungsi setupSheets terlebih dulu.');
  return sheet;
}

function sheetToObjects_(name, headers) {
  var sheet = getSheet_(name);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  return values
    .filter(function (row) { return row[0] !== '' && row[0] !== null; })
    .map(function (row) {
      var obj = {};
      headers.forEach(function (h, i) { obj[h] = row[i]; });
      return obj;
    });
}

function findRowIndexById_(sheet, id) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2; // 1-indexed + header row
  }
  return -1;
}

function upsertRow(sheetName, headers, rowObj) {
  var sheet = getSheet_(sheetName);
  if (!rowObj.ID) rowObj.ID = generateId_(sheetName);
  var rowIndex = findRowIndexById_(sheet, rowObj.ID);
  var values = headers.map(function (h) { return rowObj[h] !== undefined ? rowObj[h] : ''; });
  if (rowIndex === -1) {
    sheet.appendRow(values);
  } else {
    sheet.getRange(rowIndex, 1, 1, headers.length).setValues([values]);
  }
  return rowObj;
}

function deleteRow(sheetName, id) {
  var sheet = getSheet_(sheetName);
  var rowIndex = findRowIndexById_(sheet, id);
  if (rowIndex > -1) sheet.deleteRow(rowIndex);
  return { id: id, deleted: rowIndex > -1 };
}

function generateId_(sheetName) {
  var prefixMap = { Pelanggan: 'CUST', Layanan: 'SVC', Pesanan: 'INV' };
  var prefix = prefixMap[sheetName] || 'ID';
  if (sheetName === SHEET_ORDERS) {
    var year = new Date().getFullYear();
    var props = PropertiesService.getScriptProperties();
    var key = 'orderCounter_' + year;
    var next = (parseInt(props.getProperty(key) || '100', 10)) + 1;
    props.setProperty(key, String(next));
    return 'INV-' + year + '-' + ('0000' + next).slice(-4);
  }
  return prefix + '-' + Utilities.getUuid().slice(0, 8).toUpperCase();
}

// ============ Normalisasi payload dari frontend ============

function normalizeCustomer(p) {
  return {
    ID: p.id || '',
    Nama: p.name || '',
    Telepon: p.phone || '',
    Alamat: p.address || '',
    Tingkat: p.tier || 'Bronze',
    Poin: p.points || 0,
    TanggalGabung: p.joinDate || Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd'),
  };
}

function normalizeService(p) {
  return {
    ID: p.id || '',
    Nama: p.name || '',
    Kategori: p.category || 'Reguler',
    Harga: p.price || 0,
    Satuan: p.unit || 'kg',
    EstimasiJam: p.etaHours || 24,
  };
}

function normalizeOrder(p) {
  return {
    ID: p.id || '',
    PelangganID: p.customerId || '',
    ItemsJSON: JSON.stringify(p.items || []),
    Total: p.total || 0,
    Status: p.status || 'Baru',
    StatusBayar: p.paymentStatus || 'Belum Lunas',
    TanggalMasuk: p.createdAt || Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd'),
    EstimasiSelesai: p.dueAt || '',
    Catatan: p.notes || '',
  };
}

function saveSettings(payload) {
  var sheet = getSheet_(SHEET_SETTINGS);
  var lastRow = sheet.getLastRow();
  var keys = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 1).getValues().map(function (r) { return r[0]; }) : [];
  Object.keys(payload).forEach(function (key) {
    var idx = keys.indexOf(key);
    if (idx === -1) {
      sheet.appendRow([key, payload[key]]);
      keys.push(key);
    } else {
      sheet.getRange(idx + 2, 2).setValue(payload[key]);
    }
  });
  return getSettingsObject_();
}

function getSettingsObject_() {
  var sheet = getSheet_(SHEET_SETTINGS);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return {};
  var rows = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  var obj = {};
  rows.forEach(function (r) { if (r[0]) obj[r[0]] = r[1]; });
  return obj;
}

// ============ Mapper: baris Sheet → objek yang dipakai frontend ============

function getAllData() {
  var customers = sheetToObjects_(SHEET_CUSTOMERS, CUSTOMER_HEADERS).map(function (r) {
    return { id: r.ID, name: r.Nama, phone: r.Telepon, address: r.Alamat, tier: r.Tingkat, points: r.Poin, joinDate: fmtDate_(r.TanggalGabung) };
  });
  var services = sheetToObjects_(SHEET_SERVICES, SERVICE_HEADERS).map(function (r) {
    return { id: r.ID, name: r.Nama, category: r.Kategori, price: r.Harga, unit: r.Satuan, etaHours: r.EstimasiJam };
  });
  var orders = sheetToObjects_(SHEET_ORDERS, ORDER_HEADERS).map(function (r) {
    var items = [];
    try { items = JSON.parse(r.ItemsJSON || '[]'); } catch (e) { items = []; }
    return {
      id: r.ID,
      customerId: r.PelangganID,
      items: items,
      total: r.Total,
      status: r.Status,
      paymentStatus: r.StatusBayar,
      createdAt: fmtDate_(r.TanggalMasuk),
      dueAt: fmtDate_(r.EstimasiSelesai),
      notes: r.Catatan,
    };
  });
  var settings = getSettingsObject_();
  return { customers: customers, services: services, orders: orders, settings: settings };
}

function fmtDate_(val) {
  if (!val) return '';
  if (Object.prototype.toString.call(val) === '[object Date]') {
    return Utilities.formatDate(val, 'GMT+7', 'yyyy-MM-dd');
  }
  return String(val).slice(0, 10);
}

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
