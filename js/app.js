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

    // Background server synchronization
    DB.syncWithServer();

    // 5. Authentication & Setup status check
    if (!DB.isLoggedIn()) {
      const existingUser = DB.getUser();
      this.openSetupModal(existingUser ? 'signin' : 'register');
    } else {
      this.closeSetupModal();
    }

    // 6. Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#userAvatar') && !e.target.closest('#userDropdownMenu')) {
        this.closeUserDropdown();
      }
    });

    // 7. Hide splash screen smoothly
    setTimeout(() => {
      document.getElementById('splash-screen')?.classList.add('hidden');
    }, 900);
  },

  setupApp() {
    const business = DB.getBusiness();
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar) {
      if (business.name && business.name.trim().length > 0) {
        userAvatar.textContent = business.name.substring(0, 2).toUpperCase();
      } else {
        userAvatar.textContent = '👤';
      }
    }

    const dropdownBizName = document.getElementById('dropdownBizName');
    const dropdownBizPhone = document.getElementById('dropdownBizPhone');
    if (dropdownBizName) dropdownBizName.textContent = business.name || 'My Business';
    if (dropdownBizPhone) dropdownBizPhone.textContent = business.phone || '';

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

    // Quick Data Backup & Sign Out buttons
    document.getElementById('backupDataBtn')?.addEventListener('click', () => this.exportBackupJSON());
    document.getElementById('sidebarSignOutBtn')?.addEventListener('click', () => this.confirmSignOut());

    // Setup & Login buttons
    document.getElementById('setupCompleteBtn')?.addEventListener('click', () => this.completeSetup());
    document.getElementById('loginSubmitBtn')?.addEventListener('click', () => this.submitLogin());

    // Enter key triggers on PIN fields
    document.getElementById('loginPin')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.submitLogin();
    });
    document.getElementById('setupPin')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.completeSetup();
    });

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

  // ── AUTHENTICATION & BUSINESS PROFILE ──
  switchAuthTab(tab) {
    const isSignIn = tab === 'signin';
    const tabSignIn = document.getElementById('tabBtnSignIn');
    const tabRegister = document.getElementById('tabBtnRegister');
    const viewSignIn = document.getElementById('authSignInView');
    const viewRegister = document.getElementById('authRegisterView');

    if (tabSignIn && tabRegister && viewSignIn && viewRegister) {
      if (isSignIn) {
        tabSignIn.classList.add('active');
        tabRegister.classList.remove('active');
        viewSignIn.style.display = 'block';
        viewRegister.style.display = 'none';

        // Pre-fill last known identifier if available
        const user = DB.getUser() || DB.getBusiness();
        const idInput = document.getElementById('loginIdentifier');
        if (idInput && (user.phone || user.name)) {
          idInput.value = user.phone || user.name;
        }
      } else {
        tabRegister.classList.add('active');
        tabSignIn.classList.remove('active');
        viewRegister.style.display = 'block';
        viewSignIn.style.display = 'none';
      }
    }
  },

  async submitLogin() {
    const idInput = document.getElementById('loginIdentifier')?.value?.trim();
    const pinInput = document.getElementById('loginPin')?.value?.trim();

    if (!idInput) {
      this.showToast('Please enter your business phone or name.', 'error');
      return;
    }
    if (!pinInput) {
      this.showToast('Please enter your 4-digit security PIN.', 'error');
      return;
    }

    // Try backend authentication first
    let authenticated = false;
    let authUser = null;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: idInput, pin: pinInput })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          authenticated = true;
          authUser = json.user;
          if (json.business) DB.setBusiness(json.business);
          if (json.data) {
            if (Array.isArray(json.data.transactions)) DB.set(DB.KEYS.TRANSACTIONS, json.data.transactions);
            if (Array.isArray(json.data.inventory)) DB.set(DB.KEYS.INVENTORY, json.data.inventory);
            if (Array.isArray(json.data.debts)) DB.set(DB.KEYS.DEBTS, json.data.debts);
          }
        }
      }
    } catch (e) {
      // Offline fallback
    }

    // Local authentication check
    if (!authenticated) {
      const storedUser = DB.getUser();
      const storedBiz = DB.getBusiness();

      const matchesPhone = storedUser?.phone && storedUser.phone.toLowerCase() === idInput.toLowerCase();
      const matchesName = (storedUser?.businessName || storedBiz?.name) && (storedUser?.businessName || storedBiz?.name).toLowerCase() === idInput.toLowerCase();
      const matchesPin = storedUser?.pin ? (String(storedUser.pin) === pinInput) : (pinInput === '1234');

      if ((matchesPhone || matchesName) && matchesPin) {
        authenticated = true;
        authUser = storedUser || { businessName: storedBiz.name, phone: storedBiz.phone };
      }
    }

    if (authenticated) {
      DB.setSession({ token: 'sess_' + Date.now(), loggedInAt: new Date().toISOString() });
      DB.setSetupDone();
      if (authUser) DB.setUser(authUser);

      this.closeSetupModal();
      this.setupApp();
      this.refreshDashboard();
      Ledger.render();
      Inventory.render();
      DebtManager.render();

      this.showToast(`Welcome back, ${authUser?.businessName || 'Business Owner'}! 🎉`, 'success');
    } else {
      this.showToast('Incorrect credentials. Please verify your phone/name and PIN.', 'error');
    }
  },

  async completeSetup() {
    const name     = document.getElementById('setupBusinessName')?.value?.trim();
    const type     = document.getElementById('setupBusinessType')?.value || 'retail';
    const phone    = document.getElementById('setupPhone')?.value?.trim() || '';
    const pin      = document.getElementById('setupPin')?.value?.trim() || '1234';
    const language = document.getElementById('setupLanguage')?.value || 'en';

    if (!name) {
      this.showToast('Please enter your business name.', 'error');
      return;
    }

    const userData = { businessName: name, phone, pin, language, type };
    DB.setUser(userData);
    DB.setBusiness({ name, type, phone, language });
    DB.setSettings({ language });
    DB.setSession({ token: 'sess_' + Date.now(), loggedInAt: new Date().toISOString() });
    DB.setSetupDone();

    // Register with server if online
    try {
      fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      }).catch(() => {});
    } catch (e) {}

    this.closeSetupModal();
    I18N.setLanguage(language);

    this.setupApp();
    this.refreshDashboard();
    Ledger.render();
    Inventory.render();
    DebtManager.render();

    this.showToast(`Welcome to Voice Ledger AI, ${name}! 🎉 Brand new ledger ready.`, 'success');
  },

  confirmSignOut() {
    if (confirm('Are you sure you want to sign out of your business?')) {
      DB.logout();
      this.showToast('Signed out successfully. 👋', 'info');
      this.setupApp();
      this.openSetupModal('signin');
    }
  },

  confirmClearData() {
    if (confirm('⚠️ Start Clean Ledger: This will wipe out all transactions, inventory, and debts so you can start completely brand new. Continue?')) {
      DB.clearAllData();
      try {
        fetch('/api/data/reset', { method: 'POST' }).catch(() => {});
      } catch (e) {}

      this.refreshDashboard();
      Ledger.render();
      Inventory.render();
      DebtManager.render();
      Alerts.generateAlerts();
      this.showToast('All data cleared! Your business ledger is brand new. ✨', 'success');
    }
  },

  toggleUserDropdown(e) {
    if (e) e.stopPropagation();
    const dropdown = document.getElementById('userDropdownMenu');
    if (!dropdown) return;
    const isHidden = dropdown.classList.contains('hidden');
    if (isHidden) {
      const biz = DB.getBusiness();
      const nameEl = document.getElementById('dropdownBizName');
      const phoneEl = document.getElementById('dropdownBizPhone');
      if (nameEl) nameEl.textContent = biz.name || 'Business Owner';
      if (phoneEl) phoneEl.textContent = biz.phone || '';
      dropdown.classList.remove('hidden');
    } else {
      dropdown.classList.add('hidden');
    }
  },

  closeUserDropdown() {
    document.getElementById('userDropdownMenu')?.classList.add('hidden');
  },

  openSetupModal(initialTab = 'register') {
    const modal = document.getElementById('setupModal');
    if (!modal) return;

    const closeBtn = document.getElementById('setupModalCloseBtn');
    if (closeBtn) {
      // Only allow closing if user is already logged in
      closeBtn.style.display = DB.isLoggedIn() ? 'block' : 'none';
    }

    const biz = DB.getBusiness();
    const nameEl = document.getElementById('setupBusinessName');
    const typeEl = document.getElementById('setupBusinessType');
    const phoneEl = document.getElementById('setupPhone');
    const langEl = document.getElementById('setupLanguage');

    if (nameEl && biz.name) nameEl.value = biz.name;
    if (typeEl && biz.type) typeEl.value = biz.type;
    if (phoneEl && biz.phone) phoneEl.value = biz.phone;
    if (langEl && biz.language) langEl.value = biz.language;

    this.switchAuthTab(initialTab);

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  },

  closeSetupModal() {
    const modal = document.getElementById('setupModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('active');
      modal.style.display = 'none';
    }
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
