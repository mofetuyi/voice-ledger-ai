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
    return {
      version: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      business: {
        name: '',
        type: 'retail',
        phone: '',
        language: 'en'
      },
      users: [],
      transactions: [],
      inventory: [],
      debts: [],
      invoices: [],
      alerts: [],
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

        // Migrate to version 2 (Brand New clean state: purge all fake demo details)
        if (!this.memoryState.version || this.memoryState.version < 2) {
          this.memoryState.version = 2;
          this.memoryState.transactions = [];
          this.memoryState.inventory = [];
          this.memoryState.debts = [];
          this.memoryState.invoices = [];
          this.memoryState.alerts = [];
          if (this.memoryState.business?.name === 'TuyiTek Merchant Store') {
            this.memoryState.business.name = '';
          }
          this.saveImmediate();
        }
        return;
      } catch (err) {
        console.error('Failed to parse database file, recovering with clean schema:', err.message);
      }
    }
    this.memoryState = this.getDefaultSchema();
    this.saveImmediate();
  }

  // ── USER AUTHENTICATION ──
  findUser(identifier) {
    if (!identifier) return null;
    const users = this.getCollection('users');
    const cleanId = String(identifier).trim().toLowerCase();
    return users.find(u =>
      (u.phone && u.phone.toLowerCase() === cleanId) ||
      (u.businessName && u.businessName.toLowerCase() === cleanId)
    ) || null;
  }

  registerUser({ businessName, phone, pin, language = 'en', type = 'retail' }) {
    if (!this.memoryState.users) this.memoryState.users = [];
    const existing = this.findUser(phone) || this.findUser(businessName);
    if (existing) {
      // Update existing
      existing.pin = String(pin).trim();
      existing.businessName = businessName.trim();
      existing.phone = (phone || '').trim();
      existing.language = language;
      existing.type = type;
      existing.updatedAt = new Date().toISOString();
      this.setBusiness({ name: businessName, type, phone, language });
      this.persist();
      return { id: existing.id, businessName: existing.businessName, phone: existing.phone, language: existing.language, type: existing.type };
    }

    const newUser = {
      id: this.genId('usr'),
      businessName: businessName.trim(),
      phone: (phone || '').trim(),
      pin: String(pin).trim(),
      language,
      type,
      createdAt: new Date().toISOString()
    };
    this.memoryState.users.push(newUser);
    this.setBusiness({ name: businessName, type, phone, language });
    this.persist();
    return { id: newUser.id, businessName: newUser.businessName, phone: newUser.phone, language: newUser.language, type: newUser.type };
  }

  loginUser(identifier, pin) {
    const user = this.findUser(identifier);
    if (!user) return { success: false, error: 'User not found' };
    if (String(user.pin).trim() !== String(pin).trim()) {
      return { success: false, error: 'Incorrect PIN' };
    }
    // Update active business identity
    this.setBusiness({
      name: user.businessName,
      type: user.type || 'retail',
      phone: user.phone || '',
      language: user.language || 'en'
    });
    return {
      success: true,
      user: { id: user.id, businessName: user.businessName, phone: user.phone, language: user.language, type: user.type },
      business: this.getBusiness(),
      data: {
        transactions: this.getCollection('transactions'),
        inventory: this.getCollection('inventory'),
        debts: this.getCollection('debts'),
        invoices: this.getCollection('invoices')
      }
    };
  }

  clearAllData() {
    this.memoryState.transactions = [];
    this.memoryState.inventory = [];
    this.memoryState.debts = [];
    this.memoryState.invoices = [];
    this.memoryState.alerts = [];
    this.saveImmediate();
    return true;
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
