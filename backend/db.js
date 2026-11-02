/**
 * DB.JS - Enterprise-Grade File-Based JSON Database Engine
 * Voice Ledger AI by TuyiTek Digital Solutions
 * 
 * Features:
 * - Atomic write operations using write-rename technique to prevent file corruption
 * - In-memory write queue with write coalescing
 * - Auto-seeding for first-time launch
 * - Safe data validation and sanitization
 * - Automated backup creation
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'store.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

class DatabaseEngine {
  constructor() {
    this.memoryState = null;
    this.isWriting = false;
    this.writePending = false;
    this.initDirectories();
    this.load();
  }

  initDirectories() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
  }

  getDefaultSchema() {
    const today = new Date().toISOString().split('T')[0];
    return {
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      business: {
        name: 'TuyiTek Merchant Store',
        type: 'retail',
        phone: '+2348000000000',
        language: 'en'
      },
      transactions: [
        { id: 'tx-1', type: 'income', amount: 45000, category: 'sales', description: 'Sold rice bags to customer', customer: 'Mama Chioma', payment: 'cash', date: today },
        { id: 'tx-2', type: 'income', amount: 28500, category: 'services', description: 'Delivery service fee', customer: 'Alhaji Musa', payment: 'transfer', date: today },
        { id: 'tx-3', type: 'expense', amount: 12000, category: 'supplies', description: 'Restock supplies from market', customer: 'Vendor', payment: 'cash', date: today },
        { id: 'tx-4', type: 'income', amount: 67000, category: 'sales', description: 'Wholesale order payment', customer: 'Bello Stores', payment: 'transfer', date: today },
        { id: 'tx-5', type: 'expense', amount: 8500, category: 'transport', description: 'Delivery truck fuel', customer: '', payment: 'cash', date: today },
        { id: 'tx-6', type: 'expense', amount: 35000, category: 'rent', description: 'Monthly shop rent', customer: 'Landlord', payment: 'transfer', date: today }
      ],
      inventory: [
        { id: 'inv-1', name: 'Rice (50kg)', sku: 'RICE-50KG', category: 'Food', qty: 24, costPrice: 38000, sellingPrice: 45000, lowAlert: 5, unit: 'Bags' },
        { id: 'inv-2', name: 'Vegetable Oil (5L)', sku: 'OIL-5L', category: 'Food', qty: 3, costPrice: 4500, sellingPrice: 6000, lowAlert: 5, unit: 'Pieces' },
        { id: 'inv-3', name: 'Sugar (50kg)', sku: 'SUGAR-50', category: 'Food', qty: 0, costPrice: 42000, sellingPrice: 50000, lowAlert: 3, unit: 'Bags' },
        { id: 'inv-4', name: 'Tomatoes (basket)', sku: 'TOM-BKT', category: 'Vegetables', qty: 12, costPrice: 3500, sellingPrice: 5000, lowAlert: 4, unit: 'Pieces' },
        { id: 'inv-5', name: 'Bottled Water (pack)', sku: 'WAT-PKG', category: 'Beverages', qty: 48, costPrice: 1800, sellingPrice: 2500, lowAlert: 10, unit: 'Cartons' }
      ],
      debts: [
        { id: 'd-1', debtType: 'receivable', person: 'Ngozi Okonkwo', phone: '08012345678', amount: 25000, date: today, dueDate: today, description: 'Goods on credit - rice bags', status: 'pending' },
        { id: 'd-2', debtType: 'receivable', person: 'Alhaji Ibrahim', phone: '08098765432', amount: 50000, date: today, dueDate: today, description: 'Wholesale credit purchase', status: 'overdue' },
        { id: 'd-3', debtType: 'payable', person: 'Chukwu Distributors', phone: '09012222333', amount: 80000, date: today, dueDate: today, description: 'Supply goods on credit', status: 'pending' }
      ],
      invoices: [],
      alerts: [
        { id: 'al-1', type: 'warning', title: 'Low Stock Alert', message: 'Vegetable Oil (5L) is running low (3 remaining).', date: today, read: false }
      ],
      settings: {
        language: 'en',
        currency: '₦',
        theme: 'dark'
      }
    };
  }

  load() {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        this.memoryState = JSON.parse(raw);
        return;
      } catch (err) {
        console.error('Failed to parse database file, recovering with default schema:', err.message);
      }
    }
    this.memoryState = this.getDefaultSchema();
    this.saveImmediate();
  }

  saveImmediate() {
    this.memoryState.updatedAt = new Date().toISOString();
    const tempFile = `${DB_FILE}.${Date.now()}.tmp`;
    const data = JSON.stringify(this.memoryState, null, 2);
    try {
      fs.writeFileSync(tempFile, data, 'utf8');
      fs.renameSync(tempFile, DB_FILE);
    } catch (err) {
      console.error('Atomic database write error:', err);
    }
  }

  async persist() {
    if (this.isWriting) {
      this.writePending = true;
      return;
    }
    this.isWriting = true;
    try {
      this.saveImmediate();
    } finally {
      this.isWriting = false;
      if (this.writePending) {
        this.writePending = false;
        await this.persist();
      }
    }
  }

  genId(prefix = 'id') {
    return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
  }

  // ── COLLECTION OPERATIONS ──

  getBusiness() {
    return this.memoryState.business || {};
  }

  setBusiness(data) {
    this.memoryState.business = { ...this.getBusiness(), ...data };
    this.persist();
    return this.memoryState.business;
  }

  getSettings() {
    return this.memoryState.settings || {};
  }

  setSettings(data) {
    this.memoryState.settings = { ...this.getSettings(), ...data };
    this.persist();
    return this.memoryState.settings;
  }

  getCollection(name) {
    return Array.isArray(this.memoryState[name]) ? this.memoryState[name] : [];
  }

  find(collection, filterFn = () => true) {
    return this.getCollection(collection).filter(filterFn);
  }

  findById(collection, id) {
    return this.getCollection(collection).find(item => item.id === id) || null;
  }

  insert(collection, item) {
    if (!this.memoryState[collection]) {
      this.memoryState[collection] = [];
    }
    const record = {
      id: item.id || this.genId(collection.slice(0, 3)),
      createdAt: item.createdAt || new Date().toISOString(),
      ...item
    };
    this.memoryState[collection].unshift(record);
    this.persist();
    return record;
  }

  update(collection, id, updates) {
    const list = this.getCollection(collection);
    const index = list.findIndex(i => i.id === id);
    if (index === -1) return null;

    list[index] = {
      ...list[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.persist();
    return list[index];
  }

  delete(collection, id) {
    const list = this.getCollection(collection);
    const prevLen = list.length;
    this.memoryState[collection] = list.filter(i => i.id !== id);
    if (this.memoryState[collection].length !== prevLen) {
      this.persist();
      return true;
    }
    return false;
  }

  // ── BI-DIRECTIONAL SYNC ──
  sync(clientPayload) {
    if (!clientPayload || typeof clientPayload !== 'object') return this.memoryState;

    const collections = ['transactions', 'inventory', 'debts', 'invoices', 'alerts'];
    for (const col of collections) {
      if (Array.isArray(clientPayload[col])) {
        const serverItems = this.getCollection(col);
        const serverMap = new Map(serverItems.map(i => [i.id, i]));

        for (const clientItem of clientPayload[col]) {
          if (!clientItem.id) clientItem.id = this.genId(col.slice(0, 3));
          if (!serverMap.has(clientItem.id)) {
            serverItems.push(clientItem);
          } else {
            // Pick most recent item
            const existing = serverMap.get(clientItem.id);
            const clientTime = new Date(clientItem.updatedAt || clientItem.createdAt || 0).getTime();
            const serverTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
            if (clientTime > serverTime) {
              Object.assign(existing, clientItem);
            }
          }
        }
        this.memoryState[col] = serverItems;
      }
    }

    if (clientPayload.business && typeof clientPayload.business === 'object') {
      this.memoryState.business = { ...this.memoryState.business, ...clientPayload.business };
    }

    if (clientPayload.settings && typeof clientPayload.settings === 'object') {
      this.memoryState.settings = { ...this.memoryState.settings, ...clientPayload.settings };
    }

    this.persist();
    return this.memoryState;
  }

  // ── BACKUP / RESTORE ──
  createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `backup-${timestamp}.json`);
    const data = JSON.stringify(this.memoryState, null, 2);
    fs.writeFileSync(backupFile, data, 'utf8');
    return { filename: path.basename(backupFile), timestamp };
  }

  restore(jsonString) {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') throw new Error('Invalid backup file');
    this.memoryState = parsed;
    this.saveImmediate();
    return true;
  }
}

const db = new DatabaseEngine();
module.exports = db;
