/* ===================================
   DATA.JS - Local Storage Data Layer
   Voice Ledger AI by TuyiTek Digital Solutions
=================================== */

const DB = {
  // Keys
  KEYS: {
    BUSINESS: 'vla_business',
    TRANSACTIONS: 'vla_transactions',
    INVENTORY: 'vla_inventory',
    DEBTS: 'vla_debts',
    INVOICES: 'vla_invoices',
    ALERTS: 'vla_alerts',
    SETTINGS: 'vla_settings',
    SETUP_DONE: 'vla_setup_done',
    USER: 'vla_user',
    SESSION: 'vla_session'
  },

  // Generic get/set
  get(key) {
    try { return JSON.parse(localStorage.getItem(key)) || null; }
    catch { return null; }
  },
  set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch { return false; }
  },

  // User & Session (Sign In / Sign Out)
  getUser() {
    return this.get(this.KEYS.USER) || null;
  },
  setUser(user) {
    return this.set(this.KEYS.USER, user);
  },
  getSession() {
    return this.get(this.KEYS.SESSION) || null;
  },
  setSession(session) {
    return this.set(this.KEYS.SESSION, session);
  },
  isLoggedIn() {
    const hasSession = !!this.getSession();
    const hasBusiness = this.isSetupDone() && !!this.getBusiness()?.name;
    return hasSession || hasBusiness;
  },
  logout() {
    localStorage.removeItem(this.KEYS.SESSION);
    localStorage.removeItem(this.KEYS.SETUP_DONE);
    return true;
  },

  // Business Profile
  getBusiness() {
    return this.get(this.KEYS.BUSINESS) || { name: '', type: 'retail', phone: '', language: 'en' };
  },
  setBusiness(data) {
    const prev = this.get(this.KEYS.BUSINESS) || {};
    const res = this.set(this.KEYS.BUSINESS, { ...prev, ...data });
    this.triggerSync();
    return res;
  },

  // Transactions
  getTransactions()  { return this.get(this.KEYS.TRANSACTIONS) || []; },
  saveTransaction(tx) {
    const txs = this.getTransactions();
    const idx = txs.findIndex(t => t.id === tx.id);
    if (idx >= 0) txs[idx] = tx;
    else txs.unshift(tx);
    const res = this.set(this.KEYS.TRANSACTIONS, txs);
    this.triggerSync();
    return res;
  },
  deleteTransaction(id) {
    const txs = this.getTransactions().filter(t => t.id !== id);
    const res = this.set(this.KEYS.TRANSACTIONS, txs);
    this.triggerSync();
    return res;
  },

  // Inventory
  getInventory()   { return this.get(this.KEYS.INVENTORY) || []; },
  saveProduct(p) {
    const inv = this.getInventory();
    const idx = inv.findIndex(i => i.id === p.id);
    if (idx >= 0) inv[idx] = p;
    else inv.unshift(p);
    const res = this.set(this.KEYS.INVENTORY, inv);
    this.triggerSync();
    return res;
  },
  deleteProduct(id) {
    const res = this.set(this.KEYS.INVENTORY, this.getInventory().filter(i => i.id !== id));
    this.triggerSync();
    return res;
  },

  // Debts
  getDebts()     { return this.get(this.KEYS.DEBTS) || []; },
  saveDebt(d) {
    const debts = this.getDebts();
    const idx = debts.findIndex(x => x.id === d.id);
    if (idx >= 0) debts[idx] = d;
    else debts.unshift(d);
    const res = this.set(this.KEYS.DEBTS, debts);
    this.triggerSync();
    return res;
  },
  deleteDebt(id) {
    const res = this.set(this.KEYS.DEBTS, this.getDebts().filter(d => d.id !== id));
    this.triggerSync();
    return res;
  },
  updateDebtStatus(id, status) {
    const debts = this.getDebts();
    const debt = debts.find(d => d.id === id);
    if (debt) {
      debt.status = status;
      this.set(this.KEYS.DEBTS, debts);
      this.triggerSync();
    }
  },

  // Invoices
  getInvoices()   { return this.get(this.KEYS.INVOICES) || []; },
  saveInvoice(inv) {
    const invs = this.getInvoices();
    const idx = invs.findIndex(i => i.id === inv.id);
    if (idx >= 0) invs[idx] = inv;
    else invs.unshift(inv);
    const res = this.set(this.KEYS.INVOICES, invs);
    this.triggerSync();
    return res;
  },
  deleteInvoice(id) {
    const res = this.set(this.KEYS.INVOICES, this.getInvoices().filter(i => i.id !== id));
    this.triggerSync();
    return res;
  },

  // ── SERVER SYNC ENGINE ──
  _syncTimeout: null,
  triggerSync() {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    clearTimeout(this._syncTimeout);
    this._syncTimeout = setTimeout(() => this.syncWithServer(), 1500);
  },

  async syncWithServer() {
    if (typeof window === 'undefined' || typeof fetch === 'undefined') return;
    try {
      const payload = {
        business: this.getBusiness(),
        settings: this.getSettings(),
        transactions: this.getTransactions(),
        inventory: this.getInventory(),
        debts: this.getDebts(),
        invoices: this.getInvoices()
      };

      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const json = await res.json();
        if (json && json.data) {
          if (Array.isArray(json.data.transactions) && json.data.transactions.length > this.getTransactions().length) {
            this.set(this.KEYS.TRANSACTIONS, json.data.transactions);
          }
          if (Array.isArray(json.data.inventory) && json.data.inventory.length > this.getInventory().length) {
            this.set(this.KEYS.INVENTORY, json.data.inventory);
          }
          if (Array.isArray(json.data.debts) && json.data.debts.length > this.getDebts().length) {
            this.set(this.KEYS.DEBTS, json.data.debts);
          }
        }
      }
    } catch (e) {
      // Offline fallback
    }
  },

  DEFAULT_GEMINI_KEY: '',

  // Settings
  getSettings() {
    const s = this.get(this.KEYS.SETTINGS) || {};
    return {
      language: 'en',
      currency: '₦',
      theme: 'dark',
      geminiApiKey: s.geminiApiKey || this.DEFAULT_GEMINI_KEY,
      geminiModel: 'gemini-3-flash-preview',
      ...s
    };
  },
  setSettings(s)  { return this.set(this.KEYS.SETTINGS, { ...this.getSettings(), ...s }); },
  getGeminiKey()  {
    const s = this.getSettings();
    const k = s.geminiApiKey || this.DEFAULT_GEMINI_KEY;
    return (typeof k === 'string' ? k : '').trim();
  },
  setGeminiKey(key) {
    return this.setSettings({ geminiApiKey: (key || '').trim() });
  },

  // Alerts
  getAlerts()    { return this.get(this.KEYS.ALERTS) || []; },
  saveAlert(a) {
    const alerts = this.getAlerts();
    alerts.unshift(a);
    if (alerts.length > 50) alerts.pop();
    return this.set(this.KEYS.ALERTS, alerts);
  },
  markAlertRead(id) {
    const alerts = this.getAlerts();
    const a = alerts.find(x => x.id === id);
    if (a) { a.read = true; this.set(this.KEYS.ALERTS, alerts); }
  },
  markAllAlertsRead() {
    const alerts = this.getAlerts().map(a => ({ ...a, read: true }));
    return this.set(this.KEYS.ALERTS, alerts);
  },

  isSetupDone() { return localStorage.getItem(this.KEYS.SETUP_DONE) === 'true'; },
  setSetupDone() { localStorage.setItem(this.KEYS.SETUP_DONE, 'true'); },

  // ANALYTICS
  getAnalytics() {
    const txs = this.getTransactions();
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = today.substring(0, 7);

    const income  = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const profit  = income - expense;

    const todayTxs    = txs.filter(t => t.date === today);
    const todayIncome = todayTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const todayExpense= todayTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    const monthTxs    = txs.filter(t => t.date && t.date.startsWith(thisMonth));
    const monthIncome = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const monthExpense= monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    const debts       = this.getDebts();
    const receivable  = debts.filter(d => d.debtType === 'receivable' && d.status !== 'paid').reduce((s, d) => s + d.amount, 0);
    const payable     = debts.filter(d => d.debtType === 'payable' && d.status !== 'paid').reduce((s, d) => s + d.amount, 0);

    const inv = this.getInventory();
    const stockValue = inv.reduce((s, i) => s + (i.costPrice * i.qty), 0);
    const lowStock   = inv.filter(i => i.qty <= i.lowAlert && i.qty > 0).length;
    const outOfStock = inv.filter(i => i.qty === 0).length;

    return {
      income, expense, profit,
      todayIncome, todayExpense, todayNet: todayIncome - todayExpense, todayTxCount: todayTxs.length,
      monthIncome, monthExpense, monthProfit: monthIncome - monthExpense,
      receivable, payable, netDebt: receivable - payable,
      stockValue, lowStock, outOfStock,
      totalTransactions: txs.length,
      profitMargin: income > 0 ? ((profit / income) * 100).toFixed(1) : 0
    };
  },

  // Get data by period (last N days)
  getTransactionsByDays(days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return this.getTransactions().filter(t => new Date(t.date) >= cutoff);
  },

  // Get daily revenue/expense for chart
  getDailyData(days) {
    const txs = this.getTransactionsByDays(days);
    const result = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      result[key] = { income: 0, expense: 0, date: key };
    }
    txs.forEach(t => {
      if (result[t.date]) {
        if (t.type === 'income')  result[t.date].income  += t.amount;
        if (t.type === 'expense') result[t.date].expense += t.amount;
      }
    });
    return Object.values(result);
  },

  // Generate unique ID
  genId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  },

  // Clear all data to brand new state
  clearAllData() {
    this.set(this.KEYS.TRANSACTIONS, []);
    this.set(this.KEYS.INVENTORY, []);
    this.set(this.KEYS.DEBTS, []);
    this.set(this.KEYS.INVOICES, []);
    this.set(this.KEYS.ALERTS, []);
    this.triggerSync();
  },

  // Purge legacy demo data to ensure a 100% brand new clean ledger
  purgeDemoData() {
    if (localStorage.getItem('vla_clean_v2') !== 'true') {
      this.set(this.KEYS.TRANSACTIONS, []);
      this.set(this.KEYS.INVENTORY, []);
      this.set(this.KEYS.DEBTS, []);
      this.set(this.KEYS.INVOICES, []);
      this.set(this.KEYS.ALERTS, []);
      localStorage.setItem('vla_clean_v2', 'true');
    }
  }
};

// ── BRAND NEW INITIALIZATION (NO FAKE DEMO DATA) ──
function seedDemoData() {
  // Purge any old demo data so user gets a 100% clean, brand new ledger!
  DB.purgeDemoData();
}
