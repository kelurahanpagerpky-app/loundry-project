/**
 * LogicLaundry — Data Layer
 * ------------------------------------------------------------
 * Dua mode data:
 *  - "local"  : semua data disimpan di localStorage browser (mode demo,
 *               tidak perlu setup apa pun, cocok untuk mencoba aplikasi).
 *  - "remote" : semua data dibaca/ditulis ke Google Spreadsheet lewat
 *               Web App Google Apps Script (lihat folder /apps-script).
 *
 * Semua fungsi baca/tulis data mengembalikan Promise, supaya kode yang
 * sama bekerja untuk kedua mode. Mode & kredensial koneksi disimpan di
 * localStorage terpisah (ll_config_v1) sehingga tidak tercampur dengan
 * data itu sendiri.
 */
(function (window) {
  "use strict";

  const DB_KEY = "ll_db_v1";
  const CONFIG_KEY = "ll_config_v1";
  const SESSION_KEY = "ll_session_v1";

  function uid(prefix) {
    return (
      prefix +
      "-" +
      Date.now().toString(36).slice(-5) +
      Math.random().toString(36).slice(2, 6)
    );
  }

  function todayISO(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + (offsetDays || 0));
    return d.toISOString().slice(0, 10);
  }

  function fmtCurrency(n) {
    return "Rp" + Math.round(n || 0).toLocaleString("id-ID");
  }

  function fmtDate(iso) {
    if (!iso) return "-";
    const d = new Date(iso + "T00:00:00");
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  }

  function computeTier(points) {
    if (points >= 400) return "VIP";
    if (points >= 50) return "Reguler";
    return "Bronze";
  }

  // ---------------- Connection config (local vs remote / Google Sheets) ----------------

  function getConfig() {
    try {
      const cfg = JSON.parse(localStorage.getItem(CONFIG_KEY));
      if (cfg && cfg.mode) return cfg;
    } catch (e) {}
    return { mode: "local", webAppUrl: "", apiKey: "" };
  }

  function setConfig(cfg) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
  }

  function isRemote() {
    const cfg = getConfig();
    return cfg.mode === "remote" && !!cfg.webAppUrl && !!cfg.apiKey;
  }

  function buildGetUrl(webAppUrl, apiKey, action) {
    const sep = webAppUrl.indexOf("?") > -1 ? "&" : "?";
    return webAppUrl + sep + "action=" + encodeURIComponent(action || "getAll") + "&key=" + encodeURIComponent(apiKey);
  }

  function testConnection(webAppUrl, apiKey) {
    return fetch(buildGetUrl(webAppUrl, apiKey, "getAll"))
      .then((r) => r.json())
      .then((res) => {
        if (!res.ok) throw new Error(res.error || "Koneksi ditolak oleh server.");
        return res.data;
      });
  }

  // ---------------- Seed data (used the first time in "local" mode) ----------------

  function seedData() {
    const services = [
      { id: "SVC-001", name: "Cuci Kering Lipat", category: "Reguler", unit: "kg", price: 7000, etaHours: 24 },
      { id: "SVC-002", name: "Cuci Setrika", category: "Reguler", unit: "kg", price: 9000, etaHours: 24 },
      { id: "SVC-003", name: "Setrika Saja", category: "Reguler", unit: "kg", price: 5000, etaHours: 12 },
      { id: "SVC-004", name: "Express 6 Jam", category: "Express", unit: "kg", price: 15000, etaHours: 6 },
      { id: "SVC-005", name: "Cuci Sepatu", category: "Satuan", unit: "pasang", price: 25000, etaHours: 48 },
      { id: "SVC-006", name: "Cuci Selimut/Bed Cover", category: "Satuan", unit: "pcs", price: 30000, etaHours: 48 },
      { id: "SVC-007", name: "Dry Cleaning Jas/Gaun", category: "Satuan", unit: "pcs", price: 35000, etaHours: 72 },
    ];

    const customers = [
      { id: "CUST-001", name: "Siti Amara", phone: "081234567801", address: "Jl. Merdeka No. 12, Bandung", tier: "VIP", points: 420, joinDate: todayISO(-210) },
      { id: "CUST-002", name: "Budi Santoso", phone: "081234567802", address: "Jl. Dago No. 45, Bandung", tier: "Reguler", points: 60, joinDate: todayISO(-40) },
      { id: "CUST-003", name: "Dewi Lestari", phone: "081234567803", address: "Jl. Cihampelas No. 8, Bandung", tier: "VIP", points: 610, joinDate: todayISO(-320) },
      { id: "CUST-004", name: "Rangga Pratama", phone: "081234567804", address: "Jl. Sukajadi No. 90, Bandung", tier: "Reguler", points: 15, joinDate: todayISO(-8) },
      { id: "CUST-005", name: "Nadia Putri", phone: "081234567805", address: "Jl. Riau No. 21, Bandung", tier: "Reguler", points: 130, joinDate: todayISO(-95) },
      { id: "CUST-006", name: "Fajar Nugroho", phone: "081234567806", address: "Jl. Setiabudi No. 3, Bandung", tier: "Bronze", points: 5, joinDate: todayISO(-2) },
    ];

    function mkOrder(id, custIdx, itemsSpec, status, paid, dayOffset, notes) {
      const cust = customers[custIdx];
      const items = itemsSpec.map(([svcId, qty]) => {
        const s = services.find((x) => x.id === svcId);
        return { serviceId: s.id, name: s.name, price: s.price, unit: s.unit, qty };
      });
      const total = items.reduce((sum, it) => sum + it.price * it.qty, 0);
      return {
        id,
        customerId: cust.id,
        items,
        total,
        status,
        paymentStatus: paid,
        createdAt: todayISO(dayOffset),
        dueAt: todayISO(dayOffset + 1),
        notes: notes || "",
      };
    }

    const orders = [
      mkOrder("INV-2026-0091", 0, [["SVC-002", 4]], "Selesai", "Lunas", -1, "Wangi lavender"),
      mkOrder("INV-2026-0092", 1, [["SVC-001", 3]], "Proses", "Belum Lunas", 0, ""),
      mkOrder("INV-2026-0093", 2, [["SVC-004", 2], ["SVC-006", 1]], "Baru", "Belum Lunas", 0, "Selimut motif batik"),
      mkOrder("INV-2026-0094", 3, [["SVC-003", 5]], "Diambil", "Lunas", -3, ""),
      mkOrder("INV-2026-0095", 4, [["SVC-005", 2]], "Proses", "Lunas", -1, "Sepatu putih, hati-hati noda"),
      mkOrder("INV-2026-0096", 0, [["SVC-007", 1]], "Baru", "Belum Lunas", 0, "Jas kondangan, butuh besok sore"),
      mkOrder("INV-2026-0097", 5, [["SVC-002", 2]], "Selesai", "Lunas", -2, ""),
      mkOrder("INV-2026-0098", 2, [["SVC-004", 3]], "Diambil", "Lunas", -5, ""),
      mkOrder("INV-2026-0099", 1, [["SVC-001", 6]], "Selesai", "Belum Lunas", -1, "Ambil sore ini"),
    ];

    return {
      settings: {
        storeName: "LogicLaundry",
        tagline: "Bersih, Cepat & Terpercaya",
        address: "Jl. Melong Raya No. 88, Cimahi, Jawa Barat",
        phone: "0822-1111-2222",
        email: "halo@logiclaundry.id",
        currency: "IDR",
        waTemplate:
          "Halo {nama}, pesanan {invoice} Anda berstatus *{status}*. Total tagihan: {total}. Terima kasih telah mempercayai LogicLaundry! 🧺",
        invoiceFooter: "Terima kasih telah menggunakan jasa LogicLaundry. Simpan struk ini sebagai bukti pengambilan.",
        pointsPerRupiah: 10000,
      },
      services,
      customers,
      orders,
      counters: { order: 100 },
    };
  }

  // ---------------- Local (localStorage) cache/storage ----------------

  function loadLocal() {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) {
      const seeded = seedData();
      localStorage.setItem(DB_KEY, JSON.stringify(seeded));
      return seeded;
    }
    try {
      const parsed = JSON.parse(raw);
      if (!parsed.counters) parsed.counters = { order: 100 };
      return parsed;
    } catch (e) {
      const seeded = seedData();
      localStorage.setItem(DB_KEY, JSON.stringify(seeded));
      return seeded;
    }
  }

  function saveLocal(db) {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }

  function cacheRemote(data) {
    // Keep a local mirror of the latest remote data so the app still has
    // something to show if the connection drops (offline fallback).
    const current = loadLocal();
    const merged = Object.assign({}, current, data, { counters: current.counters || { order: 100 } });
    saveLocal(merged);
  }

  function reset() {
    const seeded = seedData();
    saveLocal(seeded);
    return seeded;
  }

  function nextOrderIdLocal(db) {
    db.counters.order += 1;
    const year = new Date().getFullYear();
    return "INV-" + year + "-" + String(db.counters.order).padStart(4, "0");
  }

  // ---------------- Remote (Google Apps Script) calls ----------------

  function postAction(action, payload) {
    const cfg = getConfig();
    return fetch(cfg.webAppUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // avoids CORS preflight on Apps Script
      body: JSON.stringify({ action, apiKey: cfg.apiKey, payload: payload || {} }),
    })
      .then((r) => r.json())
      .then((res) => {
        if (!res.ok) throw new Error(res.error || "Gagal menyimpan data ke Google Sheets.");
        if (res.all) cacheRemote(res.all);
        return res.data;
      });
  }

  function fetchAllRemote() {
    const cfg = getConfig();
    return fetch(buildGetUrl(cfg.webAppUrl, cfg.apiKey, "getAll"))
      .then((r) => r.json())
      .then((res) => {
        if (!res.ok) throw new Error(res.error || "Gagal mengambil data dari Google Sheets.");
        cacheRemote(res.data);
        return res.data;
      });
  }

  // ---------------- Public: unified async data API ----------------

  function getDB() {
    if (isRemote()) {
      return fetchAllRemote()
        .then((data) => Object.assign({}, data, { _source: "remote", _offline: false }))
        .catch((err) => {
          console.warn("LogicLaundry: gagal mengambil data dari Google Sheets, memakai data cadangan lokal.", err);
          const cached = loadLocal();
          return Object.assign({}, cached, { _source: "remote", _offline: true, _offlineError: String(err.message || err) });
        });
    }
    return Promise.resolve(Object.assign({}, loadLocal(), { _source: "local", _offline: false }));
  }

  function saveCustomer(payload) {
    if (isRemote()) return postAction("saveCustomer", payload);
    const db = loadLocal();
    if (payload.id) {
      const idx = db.customers.findIndex((c) => c.id === payload.id);
      if (idx > -1) db.customers[idx] = Object.assign({}, db.customers[idx], payload);
      else db.customers.push(payload);
    } else {
      payload.id = uid("CUST");
      payload.joinDate = payload.joinDate || todayISO();
      db.customers.push(payload);
    }
    saveLocal(db);
    return Promise.resolve(payload);
  }

  function deleteCustomer(id) {
    if (isRemote()) return postAction("deleteCustomer", { id });
    const db = loadLocal();
    db.customers = db.customers.filter((c) => c.id !== id);
    saveLocal(db);
    return Promise.resolve({ id, deleted: true });
  }

  function saveService(payload) {
    if (isRemote()) return postAction("saveService", payload);
    const db = loadLocal();
    if (payload.id) {
      const idx = db.services.findIndex((s) => s.id === payload.id);
      if (idx > -1) db.services[idx] = Object.assign({}, db.services[idx], payload);
      else db.services.push(payload);
    } else {
      payload.id = uid("SVC");
      db.services.push(payload);
    }
    saveLocal(db);
    return Promise.resolve(payload);
  }

  function deleteService(id) {
    if (isRemote()) return postAction("deleteService", { id });
    const db = loadLocal();
    db.services = db.services.filter((s) => s.id !== id);
    saveLocal(db);
    return Promise.resolve({ id, deleted: true });
  }

  function saveOrder(payload) {
    if (isRemote()) return postAction("saveOrder", payload);
    const db = loadLocal();
    if (payload.id) {
      const idx = db.orders.findIndex((o) => o.id === payload.id);
      if (idx > -1) db.orders[idx] = Object.assign({}, db.orders[idx], payload);
      else db.orders.push(payload);
    } else {
      payload.id = nextOrderIdLocal(db);
      payload.createdAt = payload.createdAt || todayISO();
      payload.dueAt = payload.dueAt || todayISO(1);
      db.orders.push(payload);
    }
    saveLocal(db);
    return Promise.resolve(payload);
  }

  function deleteOrder(id) {
    if (isRemote()) return postAction("deleteOrder", { id });
    const db = loadLocal();
    db.orders = db.orders.filter((o) => o.id !== id);
    saveLocal(db);
    return Promise.resolve({ id, deleted: true });
  }

  function saveSettings(payload) {
    if (isRemote()) return postAction("saveSettings", payload);
    const db = loadLocal();
    db.settings = Object.assign({}, db.settings, payload);
    saveLocal(db);
    return Promise.resolve(db.settings);
  }

  // ---------------- Auth (client-side demo auth; unrelated to Sheets connection) ----------------

  const DEMO_USER = { username: "admin", password: "admin123", name: "Admin LogicLaundry", role: "Admin" };

  function login(username, password) {
    if (username.trim().toLowerCase() === DEMO_USER.username && password === DEMO_USER.password) {
      const session = { name: DEMO_USER.name, username: DEMO_USER.username, role: DEMO_USER.role, loginAt: Date.now() };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return session;
    }
    return null;
  }

  function loginDemo() {
    const session = { name: "Pengguna Demo", username: "demo", role: "Demo", loginAt: Date.now() };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  function getSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY));
    } catch (e) {
      return null;
    }
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
  }

  function requireAuth() {
    if (!getSession()) {
      window.location.href = "index.html";
    }
  }

  window.LL = {
    // data (async)
    getDB,
    saveCustomer,
    deleteCustomer,
    saveService,
    deleteService,
    saveOrder,
    deleteOrder,
    saveSettings,
    reset,
    // connection config
    getConfig,
    setConfig,
    isRemote,
    testConnection,
    // utils
    uid,
    todayISO,
    fmtCurrency,
    fmtDate,
    computeTier,
    // auth
    login,
    loginDemo,
    getSession,
    logout,
    requireAuth,
    DEMO_USER,
  };
})(window);
