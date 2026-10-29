/* ===================================
   ALERTS.JS - Smart Alerts System
   Voice Ledger AI by TuyiTek Digital Solutions
=================================== */

const Alerts = {
  currentFilter: 'all',

  init() {
    this.bindEvents();
    this.generateAlerts();
    this.render();
  },

  bindEvents() {
    document.getElementById('markAllReadBtn')?.addEventListener('click', () => {
      DB.markAllAlertsRead();
      this.render();
      this.updateBadge();
      App.showToast(I18N.t('mark_all_read') + ' ✅', 'success');
    });

    document.getElementById('refreshAlertsBtn')?.addEventListener('click', () => {
      this.generateAlerts();
      this.render();
      App.showToast(I18N.t('refresh_alerts') + ' 🔄', 'info');
    });

    document.querySelectorAll('.alert-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentFilter = btn.dataset.filter;
        document.querySelectorAll('.alert-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.render();
      });
    });
  },

  // Generate AI-powered alerts from live data
  generateAlerts() {
    const inv   = DB.getInventory();
    const debts = DB.getDebts();
    const data  = DB.getAnalytics();
    const today = new Date();
    const isYo  = I18N.current === 'yo';

    const newAlerts = [];

    // Low Stock Alerts
    inv.filter(p => p.qty > 0 && p.qty <= p.lowAlert).forEach(p => {
      newAlerts.push(this.create({
        type: 'warning',
        icon: '📦',
        title: isYo ? `Ọjà Fẹ́ Tán: ${p.name}` : `Low Stock: ${p.name}`,
        desc: isYo ? `Ẹ̀yọ ${p.qty} ${p.unit} péré ló kù. Ẹ tètè ra òmíràn kí ó tó tán!` : `Only ${p.qty} ${p.unit} remaining. Restock before you run out!`,
        tag: `low-stock-${p.id}`
      }));
    });

    // Out of Stock Alerts
    inv.filter(p => p.qty === 0).forEach(p => {
      newAlerts.push(this.create({
        type: 'critical',
        icon: '❌',
        title: isYo ? `Ọjà Ti Tán Pátápátá: ${p.name}` : `Out of Stock: ${p.name}`,
        desc: isYo ? `${p.name} ti tán pátápátá! Ẹ lè pàdánù àwọn oníbàárà tí wọ́n bá wá rà á.` : `${p.name} is completely out of stock! You're losing potential sales.`,
        tag: `out-stock-${p.id}`
      }));
    });

    // Overdue Debt Alerts
    debts.filter(d => d.debtType === 'receivable' && d.status !== 'paid' && d.dueDate && new Date(d.dueDate) < today).forEach(d => {
      const daysOverdue = Math.floor((today - new Date(d.dueDate)) / 86400000);
      newAlerts.push(this.create({
        type: 'critical',
        icon: '⚠️',
        title: isYo ? `Gbèsè Tó Ti Kọjá Àkókò: ${d.person}` : `Overdue Payment: ${d.person}`,
        desc: isYo ? `${d.person} jẹ ọ́ ní ${I18N.formatCurrency(d.amount)} — ọjọ́ ${daysOverdue} ti kọjá. Ẹ rán ìránlétí sí i!` : `${d.person} owes you ${I18N.formatCurrency(d.amount)} — ${daysOverdue} day(s) overdue. Send a reminder!`,
        tag: `overdue-${d.id}`
      }));
    });

    // Loss Alert
    if (data.profit < 0 && data.income > 0) {
      newAlerts.push(this.create({
        type: 'critical',
        icon: '📉',
        title: isYo ? 'Ìkìlọ̀ Àdánù Iṣòwò' : 'Operating at a Loss',
        desc: isYo ? `Ìnáwó rẹ kọjá owó tó wọlé pẹ̀lú ${I18N.formatCurrency(Math.abs(data.profit))}. Ẹ dín ìnáwó kù.` : `Expenses exceed income by ${I18N.formatCurrency(Math.abs(data.profit))}. Review your costs immediately.`,
        tag: 'profit-deficit'
      }));
    }

    // Save alerts
    newAlerts.forEach(a => {
      const existing = DB.getAlerts().find(x => x.tag === a.tag);
      if (!existing) DB.saveAlert(a);
    });

    this.updateBadge();
    this.updateDashboardAlerts();
  },

  create({ type, icon, title, desc, tag }) {
    return {
      id: DB.genId(),
      type: type || 'info',
      icon: icon || '🔔',
      title, desc, tag,
      read: false,
      createdAt: new Date().toISOString()
    };
  },

  updateBadge() {
    const unread = DB.getAlerts().filter(a => !a.read).length;
    const badge = document.getElementById('alertBadge');
    if (badge) {
      badge.textContent   = unread;
      badge.style.display = unread > 0 ? 'inline-block' : 'none';
    }
  },

  updateDashboardAlerts() {
    const container = document.getElementById('dashAlerts');
    const countTag  = document.getElementById('dashAlertCount');
    if (!container) return;

    const alerts = DB.getAlerts().slice(0, 3);
    if (countTag) countTag.textContent = `${alerts.length} ${I18N.current === 'yo' ? 'ìkìlọ̀' : 'alerts'}`;

    if (alerts.length === 0) {
      container.innerHTML = `<p class="empty-state">${I18N.t('all_clear_alerts')}</p>`;
      return;
    }

    container.innerHTML = alerts.map(a => `
      <div class="alert-item ${a.type} ${a.read ? 'read' : 'unread'}" style="margin-bottom:8px">
        <div class="alert-icon">${a.icon}</div>
        <div class="alert-body">
          <p class="alert-title">${this.esc(a.title)}</p>
          <p class="alert-desc">${this.esc(a.desc)}</p>
        </div>
      </div>
    `).join('');
  },

  render() {
    const container = document.getElementById('alertsContainer');
    if (!container) return;

    let alerts = DB.getAlerts();
    if (this.currentFilter !== 'all') {
      alerts = alerts.filter(a => a.type === this.currentFilter);
    }

    if (alerts.length === 0) {
      container.innerHTML = `<p class="empty-state" style="padding:40px;text-align:center">${I18N.t('all_clear_alerts')}</p>`;
      return;
    }

    container.innerHTML = alerts.map(a => `
      <div class="alert-item ${a.type} ${a.read ? 'read' : 'unread'}" onclick="Alerts.markRead('${a.id}')">
        <div class="alert-icon">${a.icon}</div>
        <div class="alert-body">
          <p class="alert-title">${this.esc(a.title)}</p>
          <p class="alert-desc">${this.esc(a.desc)}</p>
          <span class="alert-time">${new Date(a.createdAt).toLocaleDateString(I18N.current === 'yo' ? 'yo-NG' : 'en-NG', { hour:'2-digit', minute:'2-digit' })}</span>
        </div>
        <span class="alert-type-badge ${a.type}">${a.type.toUpperCase()}</span>
      </div>
    `).join('');

    this.updateBadge();
  },

  markRead(id) {
    DB.markAlertRead(id);
    this.render();
    this.updateBadge();
  },

  esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
};
