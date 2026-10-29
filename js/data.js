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
    SETUP_DONE: 'vla_setup_done'
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

  // Business
  getBusiness()     { return this.get(this.KEYS.BUSINESS) || { name: 'My Business', type: 'retail', phone: '', language: 'en' }; },
  setBusiness(data) { return this.set(this.KEYS.BUSINESS, data); },

  // Transactions
  getTransactions()  { return this.get(this.KEYS.TRANSACTIONS) || []; },
  saveTransaction(tx) {
    const txs = this.getTransactions();
    const idx = txs.findIndex(t => t.id === tx.id);
    if (idx >= 0) txs[idx] = tx;
    else txs.unshift(tx);
    return this.set(this.KEYS.TRANSACTIONS, txs);
  },
  deleteTransaction(id) {
    const txs = this.getTransactions().filter(t => t.id !== id);
    return this.set(this.KEYS.TRANSACTIONS, txs);
  },

  // Inventory
  getInventory()   { return this.get(this.KEYS.INVENTORY) || []; },
  saveProduct(p) {
    const inv = this.getInventory();
    const idx = inv.findIndex(i => i.id === p.id);
    if (idx >= 0) inv[idx] = p;
    else inv.unshift(p);
    return this.set(this.KEYS.INVENTORY, inv);
  },
  deleteProduct(id) {
    return this.set(this.KEYS.INVENTORY, this.getInventory().filter(i => i.id !== id));
  },

  // Debts
  getDebts()     { return this.get(this.KEYS.DEBTS) || []; },
  saveDebt(d) {
    const debts = this.getDebts();
    const idx = debts.findIndex(x => x.id === d.id);
    if (idx >= 0) debts[idx] = d;
    else debts.unshift(d);
    return this.set(this.KEYS.DEBTS, debts);
  },
  deleteDebt(id) {
    return this.set(this.KEYS.DEBTS, this.getDebts().filter(d => d.id !== id));
  },
  updateDebtStatus(id, status) {
    const debts = this.getDebts();
    const debt = debts.find(d => d.id === id);
    if (debt) { debt.status = status; this.set(this.KEYS.DEBTS, debts); }
  },

  // Invoices
  getInvoices()   { return this.get(this.KEYS.INVOICES) || []; },
  saveInvoice(inv) {
    const invs = this.getInvoices();
    const idx = invs.findIndex(i => i.id === inv.id);
    if (idx >= 0) invs[idx] = inv;
    else invs.unshift(inv);
    return this.set(this.KEYS.INVOICES, invs);
  },
  deleteInvoice(id) {
    return this.set(this.KEYS.INVOICES, this.getInvoices().filter(i => i.id !== id));
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
  }
};

// ── SEED DEMO DATA (first time) ──
function seedDemoData() {
  if (DB.isSetupDone()) return;

  // Only seed if no transactions
  if (DB.getTransactions().length > 0) return;

  const today = new Date();
  const fmt = (d) => d.toISOString().split('T')[0];

  const demoTxs = [
    { id: DB.genId(), type: 'income',  amount: 45000,  category: 'sales',    description: 'Sold rice bags to customer',   customer: 'Mama Chioma',  payment: 'cash',     date: fmt(new Date(today - 1*86400000)) },
    { id: DB.genId(), type: 'income',  amount: 28500,  category: 'services', description: 'Delivery service fee',         customer: 'Alhaji Musa',  payment: 'transfer', date: fmt(new Date(today - 2*86400000)) },
    { id: DB.genId(), type: 'expense', amount: 12000,  category: 'supplies', description: 'Restock supplies from market', customer: 'Vendor',       payment: 'cash',     date: fmt(new Date(today - 2*86400000)) },
    { id: DB.genId(), type: 'income',  amount: 67000,  category: 'sales',    description: 'Wholesale order payment',      customer: 'Bello Stores', payment: 'transfer', date: fmt(new Date(today - 3*86400000)) },
    { id: DB.genId(), type: 'expense', amount: 8500,   category: 'transport',description: 'Delivery truck fuel',          customer: '',             payment: 'cash',     date: fmt(new Date(today - 3*86400000)) },
    { id: DB.genId(), type: 'expense', amount: 35000,  category: 'rent',     description: 'Monthly shop rent',            customer: 'Landlord',     payment: 'transfer', date: fmt(new Date(today - 5*86400000)) },
    { id: DB.genId(), type: 'income',  amount: 18000,  category: 'sales',    description: 'Evening market sales',         customer: 'Various',      payment: 'cash',     date: fmt(today) },
    { id: DB.genId(), type: 'expense', amount: 3200,   category: 'utilities',description: 'Generator fuel',               customer: '',             payment: 'cash',     date: fmt(today) },
  ];

  demoTxs.forEach(t => DB.saveTransaction(t));

  const demoProducts = [
    { id: DB.genId(), name: 'Rice (50kg)', sku: 'RICE-50KG', category: 'Food', qty: 24, costPrice: 38000, sellingPrice: 45000, lowAlert: 5, unit: 'Bags' },
    { id: DB.genId(), name: 'Vegetable Oil (5L)', sku: 'OIL-5L', category: 'Food', qty: 3, costPrice: 4500, sellingPrice: 6000, lowAlert: 5, unit: 'Pieces' },
    { id: DB.genId(), name: 'Sugar (50kg)', sku: 'SUGAR-50', category: 'Food', qty: 0, costPrice: 42000, sellingPrice: 50000, lowAlert: 3, unit: 'Bags' },
    { id: DB.genId(), name: 'Tomatoes (basket)', sku: 'TOM-BKT', category: 'Vegetables', qty: 12, costPrice: 3500, sellingPrice: 5000, lowAlert: 4, unit: 'Pieces' },
    { id: DB.genId(), name: 'Bottled Water (pack)', sku: 'WAT-PKG', category: 'Beverages', qty: 48, costPrice: 1800, sellingPrice: 2500, lowAlert: 10, unit: 'Cartons' },
  ];
  demoProducts.forEach(p => DB.saveProduct(p));

  const demoDebts = [
    { id: DB.genId(), debtType: 'receivable', person: 'Ngozi Okonkwo',  phone: '08012345678', amount: 25000, date: fmt(new Date(today - 7*86400000)),  dueDate: fmt(new Date(today.setDate(today.getDate() + 7))),  description: 'Goods on credit – rice bags', status: 'pending' },
    { id: DB.genId(), debtType: 'receivable', person: 'Alhaji Ibrahim',  phone: '08098765432', amount: 50000, date: fmt(new Date(today - 14*86400000)), dueDate: fmt(new Date(today - 3*86400000)),  description: 'Wholesale credit purchase',   status: 'overdue' },
    { id: DB.genId(), debtType: 'payable',    person: 'Chukwu Distributors', phone: '09012222333', amount: 80000, date: fmt(new Date(today - 10*86400000)), dueDate: fmt(new Date(today.setDate(today.getDate() + 5))), description: 'Supply goods on credit',      status: 'pending' },
  ];
  demoDebts.forEach(d => DB.saveDebt(d));
}
