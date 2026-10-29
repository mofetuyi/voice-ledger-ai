/* ===================================
   APP.JS - Main Application Controller
   Voice Ledger AI by TuyiTek Digital Solutions
=================================== */

const App = {
  currentPage: 'dashboard',

  init() {
    // 1. Seed demo data if first visit
    seedDemoData();

    // 2. Load stored settings & business identity
    const settings = DB.getSettings();
    const business = DB.getBusiness();

    // 3. Set current language and apply translations
    I18N.setLanguage(business.language || settings.language || 'en');

    // 4. Initialize all modules
    this.initModules();
    this.bindGlobalEvents();
    this.setupApp();
    this.updateHeaderDate();

    // 5. Hide splash screen smoothly
    setTimeout(() => {
      document.getElementById('splash-screen')?.classList.add('hidden');
    }, 900);
  },

  setupApp() {
    const business = DB.getBusiness();
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar && business.name) {
      userAvatar.textContent = business.name.substring(0, 2).toUpperCase();
    }
    this.refreshDashboard();
  },

  bindGlobalEvents() {
    // Sidebar navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.dataset.page;
        if (page) this.navigate(page);
      });
    });

    // Mobile sidebar toggle
    document.getElementById('menuToggle')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.toggle('open');
    });
    document.getElementById('sidebarClose')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.remove('open');
    });

    // Language dropdown change
    document.getElementById('languageSelect')?.addEventListener('change', (e) => {
      I18N.setLanguage(e.target.value);
      this.showToast(`Èdè ti yí padà / Language switched! 🌍`, 'success');
    });

    // Quick Data Backup & Sample Demo Data buttons
    document.getElementById('backupDataBtn')?.addEventListener('click', () => this.exportBackupJSON());
    document.getElementById('demoDataBtn')?.addEventListener('click', () => this.loadDemoDataPrompt());

    // Setup modal completion
    document.getElementById('setupCompleteBtn')?.addEventListener('click', () => this.completeSetup());

    // Keyboard shortcut (Escape closes modals)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.getElementById('voiceOverlay')?.classList.remove('active');
        document.getElementById('sidebar')?.classList.remove('open');
      }
    });
  },

  initModules() {
    VoiceModule.init();
    Ledger.init();
    Inventory.init();
    DebtManager.init();
    InvoiceModule.init();
    AIAssistant.init();
    Alerts.init();
    Reports.init();
    this.initPnL();
    this.initSummary();
  },

  // ══════════════════════════════════════════════
  // FULL SYSTEM LANGUAGE CHANGE HANDLER
  // ══════════════════════════════════════════════
  onLanguageChanged(lang) {
    // 1. Update text & placeholders
    I18N.applyToDOM();

    // 2. Update navigation breadcrumb
    const breadcrumb = document.getElementById('pageBreadcrumb');
    if (breadcrumb) {
      const activeNav = document.querySelector(`.nav-item[data-page="${this.currentPage}"] .nav-label`);
      breadcrumb.textContent = activeNav ? activeNav.textContent : I18N.t(`nav_${this.currentPage}`);
    }

    // 3. Re-render all modules
    this.refreshDashboard();
    Ledger.render();
    Inventory.populateCategories();
    Inventory.render();
    DebtManager.render();
    InvoiceModule.updatePreview();
    HealthScore.render();
    Alerts.generateAlerts();
    Alerts.render();
    AIAssistant.updateLanguage();
    this.renderPnL();
    this.renderSummary();
    this.updateHeaderDate();
  },

  navigate(pageId) {
    if (!pageId) return;
    this.currentPage = pageId;

    // Switch page container
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(`page-${pageId}`);
    if (target) {
      target.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Update sidebar active link
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`nav-${pageId}`)?.classList.add('active');

    // Update breadcrumb
    const breadcrumb = document.getElementById('pageBreadcrumb');
    if (breadcrumb) {
      const activeNav = document.querySelector(`.nav-item[data-page="${pageId}"] .nav-label`);
      breadcrumb.textContent = activeNav ? activeNav.textContent : I18N.t(`nav_${pageId}`);
    }

    // Close mobile drawer
    document.getElementById('sidebar')?.classList.remove('open');

    // Re-render specific pages
    if (pageId === 'dashboard') this.refreshDashboard();
    if (pageId === 'ledger')    Ledger.render();
    if (pageId === 'inventory') Inventory.render();
    if (pageId === 'debts')     DebtManager.render();
    if (pageId === 'invoice')   InvoiceModule.updatePreview();
    if (pageId === 'health')    HealthScore.render();
    if (pageId === 'alerts')    Alerts.render();
    if (pageId === 'summary')   this.renderSummary();
    if (pageId === 'pnl')       this.renderPnL();
  },

  refreshDashboard() {
    const data = DB.getAnalytics();
    const fmt  = I18N.formatCurrency;

    // KPI Cards
    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    el('kpiRevenue',  fmt(data.income));
    el('kpiExpenses', fmt(data.expense));
    el('kpiProfit',   fmt(data.profit));
    el('kpiDebts',    fmt(data.receivable));

    const debtorCount = DB.getDebts().filter(d=>d.debtType==='receivable'&&d.status!=='paid').length;
    el('kpiDebtsChange', `${debtorCount} ${I18N.t('customers_count')}`);

    const profitChange = document.getElementById('kpiProfitChange');
    if (profitChange) {
      profitChange.textContent = data.profit >= 0 ? `+${data.profitMargin}%` : `${data.profitMargin}%`;
      profitChange.className   = `kpi-change ${data.profit >= 0 ? 'positive' : 'negative'}`;
    }

    // Localized date
    const dashDate = document.getElementById('dashDate');
    if (dashDate) {
      dashDate.textContent = new Date().toLocaleDateString(I18N.current === 'yo' ? 'yo-NG' : 'en-NG', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
    }

    // Health gauge
    HealthScore.render();

    // Chart
    const days = parseInt(document.getElementById('chartFilter')?.value) || 30;
    Charts.renderRevenueChart(days);

    // Recent transactions
    this.renderRecentTransactions();

    // Alerts
    Alerts.generateAlerts();
    Alerts.updateDashboardAlerts();
  },

  renderRecentTransactions() {
    const container = document.getElementById('dashTransactions');
    if (!container) return;

    const txs = DB.getTransactions().slice(0, 6);
    if (txs.length === 0) {
      container.innerHTML = `<p class="empty-state">${I18N.t('no_transactions_yet')}</p>`;
      return;
    }

    container.innerHTML = txs.map(tx => {
      const catKey = 'cat_' + tx.category;
      const catLabel = I18N.t(catKey) || tx.category;
      const payLabel = I18N.t(tx.payment) || tx.payment;

      return `
        <div class="tx-item">
          <div class="tx-icon">${tx.type === 'income' ? '💰' : '💸'}</div>
          <div class="tx-info">
            <div class="tx-desc">${this.esc(tx.description)}</div>
            <div class="tx-meta">${catLabel} · ${payLabel} · ${new Date(tx.date).toLocaleDateString(I18N.current === 'yo' ? 'yo-NG' : 'en-NG')}</div>
          </div>
          <div class="tx-amount ${tx.type}">${tx.type === 'income' ? '+' : '-'}${I18N.formatCurrency(tx.amount)}</div>
        </div>
      `;
    }).join('');

    document.getElementById('chartFilter')?.addEventListener('change', (e) => {
      Charts.renderRevenueChart(parseInt(e.target.value));
    });
  },

  initPnL() {
    document.getElementById('exportPnlBtn')?.addEventListener('click', () => Reports.exportPDF());
    document.getElementById('pnlPeriod')?.addEventListener('change', () => this.renderPnL());
  },

  renderPnL() {
    const txs = DB.getTransactions();
    const income  = txs.filter(t => t.type === 'income').reduce((s,t) => s+t.amount, 0);
    const expense = txs.filter(t => t.type === 'expense').reduce((s,t) => s+t.amount, 0);
    const profit  = income - expense;
    const margin  = income > 0 ? ((profit / income) * 100).toFixed(1) : 0;

    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    el('pnlIncome',  I18N.formatCurrency(income));
    el('pnlExpense', I18N.formatCurrency(expense));
    el('pnlGross',   I18N.formatCurrency(income));
    el('pnlNet',     I18N.formatCurrency(profit));
    el('pnlMarginPct', `${margin}%`);

    const fill = document.getElementById('pnlMarginFill');
    if (fill) fill.style.width = `${Math.min(100, Math.max(0, parseFloat(margin)))}%`;

    const netEl = document.getElementById('pnlNet');
    if (netEl) netEl.style.color = profit >= 0 ? 'var(--success)' : 'var(--danger)';

    Charts.renderPnLCharts();
    this.renderPnLTable();
  },

  renderPnLTable() {
    const tbody = document.getElementById('pnlTableBody');
    if (!tbody) return;

    const txs = DB.getTransactions();
    if (txs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="empty-cell">${I18N.t('pnl_empty')}</td></tr>`;
      return;
    }

    const catMap = {};
    txs.forEach(t => {
      const cat = t.category || 'other';
      if (!catMap[cat]) catMap[cat] = { income: 0, expense: 0 };
      if (t.type === 'income')  catMap[cat].income  += t.amount;
      if (t.type === 'expense') catMap[cat].expense += t.amount;
    });

    tbody.innerHTML = Object.entries(catMap).map(([cat, vals]) => {
      const net = vals.income - vals.expense;
      const catKey = 'cat_' + cat;
      const catName = I18N.t(catKey) || cat;
      return `
        <tr>
          <td><strong>${catName}</strong></td>
          <td style="color:var(--success)">${I18N.formatCurrency(vals.income)}</td>
          <td style="color:var(--danger)">${I18N.formatCurrency(vals.expense)}</td>
          <td style="font-weight:600;color:${net>=0?'var(--success)':'var(--danger)'}">${I18N.formatCurrency(net)}</td>
        </tr>
      `;
    }).join('');
  },

  initSummary() {
    const sumDate = document.getElementById('summaryDate');
    if (sumDate) sumDate.value = new Date().toISOString().split('T')[0];
    document.getElementById('summaryDate')?.addEventListener('change', () => this.renderSummary());
    document.getElementById('shareSummaryBtn')?.addEventListener('click', () => this.shareSummary());
  },

  renderSummary() {
    const data    = DB.getAnalytics();
    const biz     = DB.getBusiness();
    const isYo    = I18N.current === 'yo';
    const today   = new Date().toLocaleDateString(isYo ? 'yo-NG' : 'en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const fmt     = I18N.formatCurrency;

    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    el('todaySales',    fmt(data.todayIncome));
    el('todayExpenses', fmt(data.todayExpense));
    el('todayNet',      fmt(data.todayNet));
    el('todayTxCount',  data.todayTxCount);

    const heading = document.getElementById('summaryHeading');
    if (heading) heading.textContent = isYo ? `Àkópọ̀ Iṣòwò — ${today}` : `Business Summary — ${today}`;

    const summaryEl = document.getElementById('summaryContent');
    if (summaryEl) {
      const emoji  = data.todayNet > 0 ? '📈' : data.todayNet < 0 ? '📉' : '➡️';

      if (isYo) {
        summaryEl.innerHTML = `
          <p>${emoji} <strong>${I18N.getGreeting()}, ${biz.name || 'Olówó Òwò'}!</strong></p>
          <p>Àkópọ̀ iṣòwò rẹ tí ẹ̀rọ AI ṣe fún <strong>${today}</strong> nìyí.</p>
          <br/>
          <p>💰 Lónìí, iṣòwò rẹ kọ <span class="highlight">iṣòwò ${data.todayTxCount}</span> sílẹ̀:</p>
          <p>• Títà / Owó Wọlé: <span class="highlight">${fmt(data.todayIncome)}</span></p>
          <p>• Ìnáwó: <span class="${data.todayExpense > 0 ? 'warn' : 'highlight'}">${fmt(data.todayExpense)}</span></p>
          <p>• Èrè gidi lónìí: <span class="${data.todayNet >= 0 ? 'highlight' : 'warn'}">${fmt(data.todayNet)}</span></p>
          <br/>
          <p>📊 <strong>Ipò Iṣòwò Rẹ Pátápátá:</strong></p>
          <p>• Apapọ̀ Owó Wọlé: <span class="highlight">${fmt(data.income)}</span></p>
          <p>• Apapọ̀ Ìnáwó: <span class="${data.expense > 0 ? 'warn' : 'highlight'}">${fmt(data.expense)}</span></p>
          <p>• Èrè Gidi: <span class="${data.profit >= 0 ? 'highlight' : 'warn'}">${fmt(data.profit)}</span> (${data.profitMargin}% ìwọ̀n èrè)</p>
          <br/>
          ${data.receivable > 0 ? `<p>⚠️ Ẹ ní <span class="warn">${fmt(data.receivable)}</span> nínú gbèsè tí àwọn oníbàárà kò tí ì san. Ẹ ranti rán ìránlétí sí wọn.</p><br/>` : ''}
          ${data.lowStock > 0 ? `<p>📦 <span class="warn">Ọjà ${data.lowStock}</span> ti fẹ́ tán nílẹ̀. Ẹ tètè ra òmíràn!</p><br/>` : ''}
          <p style="font-style:italic;color:var(--text-muted)">
            💡 <strong>Àmọ̀ràn AI TuyiTek:</strong> ${this.getDailyTip()}
          </p>
          <br/>
          <p style="font-size:12px;color:var(--text-muted)">Agbára Rẹ̀ Wá Láti Voice Ledger AI · TuyiTek Digital Solutions · ${new Date().toLocaleTimeString('en-NG')}</p>
        `;
      } else {
        summaryEl.innerHTML = `
          <p>${emoji} <strong>${I18N.getGreeting()}, ${biz.name || 'Business Owner'}!</strong></p>
          <p>Here is your AI-generated business summary for <strong>${today}</strong>.</p>
          <br/>
          <p>💰 Today, your business recorded <span class="highlight">${data.todayTxCount} transaction(s)</span>:</p>
          <p>• Sales / Revenue: <span class="highlight">${fmt(data.todayIncome)}</span></p>
          <p>• Expenses: <span class="${data.todayExpense > 0 ? 'warn' : 'highlight'}">${fmt(data.todayExpense)}</span></p>
          <p>• Net for today: <span class="${data.todayNet >= 0 ? 'highlight' : 'warn'}">${fmt(data.todayNet)}</span></p>
          <br/>
          <p>📊 <strong>Overall Financial Position:</strong></p>
          <p>• Total Revenue: <span class="highlight">${fmt(data.income)}</span></p>
          <p>• Total Expenses: <span class="${data.expense > 0 ? 'warn' : 'highlight'}">${fmt(data.expense)}</span></p>
          <p>• Net Profit: <span class="${data.profit >= 0 ? 'highlight' : 'warn'}">${fmt(data.profit)}</span> (${data.profitMargin}% margin)</p>
          <br/>
          ${data.receivable > 0 ? `<p>⚠️ You have <span class="warn">${fmt(data.receivable)}</span> in customer receivables awaiting collection.</p><br/>` : ''}
          ${data.lowStock > 0 ? `<p>📦 <span class="warn">${data.lowStock} item(s)</span> are near or at reorder thresholds.</p><br/>` : ''}
          <p style="font-style:italic;color:var(--text-muted)">
            💡 <strong>TuyiTek Financial Insight:</strong> ${this.getDailyTip()}
          </p>
          <br/>
          <p style="font-size:12px;color:var(--text-muted)">Generated by Voice Ledger AI · TuyiTek Digital Solutions · ${new Date().toLocaleTimeString('en-NG')}</p>
        `;
      }
    }

    // Top performers
    const perfEl = document.getElementById('topPerformers');
    if (perfEl) {
      const todayISO = new Date().toISOString().split('T')[0];
      const txs = DB.getTransactions().filter(t => t.type === 'income' && t.date === todayISO);
      if (txs.length === 0) {
        perfEl.innerHTML = `<p class="empty-state">${I18N.t('no_tx_found')}</p>`;
      } else {
        const sorted = txs.sort((a,b) => b.amount - a.amount).slice(0, 3);
        perfEl.innerHTML = sorted.map((t,i) => `
          <div class="today-stat">
            <span>${['🥇','🥈','🥉'][i]} ${this.esc(t.description).substring(0,20)}...</span>
            <span style="color:var(--success);font-weight:700">${I18N.formatCurrency(t.amount)}</span>
          </div>
        `).join('');
      }
    }

    // AI Recommendations
    const recEl = document.getElementById('aiRecommendations');
    if (recEl) {
      const recs = HealthScore.getRecommendations(HealthScore.calculate()).slice(0, 2);
      recEl.innerHTML = recs.map(r => `
        <div class="today-stat" style="flex-direction:column;align-items:flex-start;gap:4px">
          <span style="font-weight:600">${r.icon} ${r.title}</span>
          <span style="font-size:12px;color:var(--text-muted)">${r.text}</span>
        </div>
      `).join('');
    }
  },

  getDailyTip() {
    const isYo = I18N.current === 'yo';
    if (isYo) {
      const yoTips = [
        'Kọ gbogbo iṣòwò rẹ sílẹ̀ lónìí — kódà owó kékeré pàápàá.',
        'Rán ìránlétí WhatsApp sí àwọn tí wọ́n jẹ ọ́ ní gbèsè ní ọ̀sẹ̀ yìí.',
        'Ṣàyẹ̀wò àwọn ọjà rẹ kí o sì ra àwọn tó fẹ́ tán kíákíá.',
        'Mọ èrè gidi tí o rí lónìí kí o sì ya ìpín 20% sọ́tọ̀ fún ìdàgbàsókè òwò rẹ.',
        'Lo ohùn rẹ lórí Voice Ledger AI láti kọ títà sílẹ̀ ní kánkán.'
      ];
      return yoTips[Math.floor(Math.random() * yoTips.length)];
    }
    const tips = [
      'Log every transaction — even small ₦500 purchases add up significantly.',
      'Promptly follow up on receivables using WhatsApp payment reminders.',
      'Monitor your low-stock notifications and reorder before depletion.',
      'Reinvest at least 20% of net profits into fast-turning stock.',
      'Use voice logging on your mobile phone to record sales on the fly!'
    ];
    return tips[Math.floor(Math.random() * tips.length)];
  },

  shareSummary() {
    const biz  = DB.getBusiness();
    const data = DB.getAnalytics();
    const isYo = I18N.current === 'yo';

    const text = isYo
      ? `📊 *Àkópọ̀ Iṣòwò ${biz.name || 'TuyiTek'}*\n\n💰 Owó Wọlé: ${I18N.formatCurrency(data.income)}\n💸 Ìnáwó: ${I18N.formatCurrency(data.expense)}\n📈 Èrè Gidi: ${I18N.formatCurrency(data.profit)}\n\n_Agbára Rẹ̀ Wá Láti Voice Ledger AI · TuyiTek Digital Solutions_`
      : `📊 *${biz.name || 'Business'} Financial Summary*\n\n💰 Revenue: ${I18N.formatCurrency(data.income)}\n💸 Expenses: ${I18N.formatCurrency(data.expense)}\n📈 Net Profit: ${I18N.formatCurrency(data.profit)}\n\n_Powered by Voice Ledger AI · TuyiTek Digital Solutions_`;

    if (navigator.share) {
      navigator.share({ title: 'Business Summary', text });
    } else {
      const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(waUrl, '_blank');
      App.showToast('Opened WhatsApp to share summary! 📲', 'info');
    }
  },

  // ══════════════════════════════════════════════
  // BACKUP & RESTORE DATA (PRODUCTION READINESS)
  // ══════════════════════════════════════════════
  exportBackupJSON() {
    const backup = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      business: DB.getBusiness(),
      settings: DB.getSettings(),
      transactions: DB.getTransactions(),
      inventory: DB.getInventory(),
      debts: DB.getDebts(),
      invoices: DB.getInvoices()
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute('href', dataStr);
    dl.setAttribute('download', `voice-ledger-tuyitek-backup-${new Date().toISOString().split('T')[0]}.json`);
    dl.click();
    this.showToast('Complete business backup exported! 💾', 'success');
  },

  loadDemoDataPrompt() {
    if (confirm('Load sample Nigerian SME demo data (Rice, Palm Oil, Sales, Debts)?')) {
      localStorage.removeItem(DB.KEYS.SETUP_DONE);
      seedDemoData();
      this.refreshDashboard();
      Ledger.render();
      Inventory.populateCategories();
      Inventory.render();
      DebtManager.render();
      this.showToast('Sample business data loaded! ⚡', 'success');
    }
  },

  completeSetup() {
    const name     = document.getElementById('setupBusinessName')?.value?.trim();
    const type     = document.getElementById('setupBusinessType')?.value || 'retail';
    const phone    = document.getElementById('setupPhone')?.value?.trim() || '';
    const language = document.getElementById('setupLanguage')?.value || 'en';

    if (!name) {
      this.showToast('Please enter your business name.', 'error');
      return;
    }

    DB.setBusiness({ name, type, phone, language });
    DB.setSettings({ language });
    DB.setSetupDone();

    document.getElementById('setupModal')?.classList.remove('active');
    I18N.setLanguage(language);

    this.setupApp();
    this.showToast(`Welcome to Voice Ledger AI, ${name}! 🎉 Powered by TuyiTek Digital Solutions`, 'success');
  },

  updateHeaderDate() {
    const dateEl = document.getElementById('headerDate');
    if (dateEl) {
      dateEl.textContent = new Date().toLocaleDateString(I18N.current === 'yo' ? 'yo-NG' : 'en-NG', {
        weekday: 'short', month: 'short', day: 'numeric'
      });
    }
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icons = { success: '✅', error: '❌', warning: '⚠️', info: '💡' };
    const div = document.createElement('div');
    div.className = `toast ${type}`;
    div.innerHTML = `
      <span>${icons[type] || '🔔'}</span>
      <span>${message}</span>
    `;

    container.appendChild(div);
    setTimeout(() => {
      div.style.animation = 'slide-down 0.3s ease reverse forwards';
      setTimeout(() => div.remove(), 300);
    }, 3800);
  },

  esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
};

// Initialize application on DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());
