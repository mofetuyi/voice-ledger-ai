/* ===================================
   REPORTS.JS - Financial Reports
   Voice Ledger AI by TuyiTek Digital Solutions
=================================== */

const Reports = {
  init() {
    this.bindEvents();
    Charts.renderReportsChart();
  },

  bindEvents() {
    document.getElementById('generateReportBtn')?.addEventListener('click', () => this.generateSelected());
    document.getElementById('reportPeriod')?.addEventListener('change', () => Charts.renderReportsChart());
    document.getElementById('exportReportCSV')?.addEventListener('click', () => this.exportCSV());
    document.getElementById('exportReportPDF')?.addEventListener('click', () => this.exportPDF());

    document.querySelectorAll('.report-type-card').forEach(card => {
      card.querySelector('button')?.addEventListener('click', () => {
        this.generate(card.dataset.report);
      });
    });
  },

  generateSelected() {
    const period = document.getElementById('reportPeriod')?.value || 'month';
    this.generate('pnl', period);
  },

  generate(type, period = 'month') {
    const output = document.getElementById('reportOutput');
    const title  = document.getElementById('reportTitle');
    const content= document.getElementById('reportContent');
    if (!output || !title || !content) return;

    output.style.display = 'block';
    output.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    const txs = DB.getTransactions();
    const now  = new Date();
    let filteredTxs = txs;

    if (period === 'month') {
      const month = now.toISOString().substring(0, 7);
      filteredTxs = txs.filter(t => t.date?.startsWith(month));
    } else if (period === 'quarter') {
      const cutoff = new Date(now.getFullYear(), Math.floor(now.getMonth()/3)*3, 1).toISOString().split('T')[0];
      filteredTxs = txs.filter(t => t.date >= cutoff);
    } else if (period === 'year') {
      filteredTxs = txs.filter(t => t.date?.startsWith(now.getFullYear().toString()));
    }

    const income  = filteredTxs.filter(t => t.type === 'income').reduce((s,t) => s+t.amount, 0);
    const expense = filteredTxs.filter(t => t.type === 'expense').reduce((s,t) => s+t.amount, 0);
    const profit  = income - expense;

    switch(type) {
      case 'pnl':
        title.textContent = I18N.t('card_pnl_title');
        content.innerHTML = this.renderPnL(filteredTxs, income, expense, profit);
        break;
      case 'cashflow':
        title.textContent = I18N.t('card_cashflow_title');
        content.innerHTML = this.renderCashFlow(filteredTxs, income, expense);
        break;
      case 'inventory':
        title.textContent = I18N.t('card_inventory_title');
        content.innerHTML = this.renderInventory();
        break;
      case 'debt':
        title.textContent = I18N.t('card_debt_title');
        content.innerHTML = this.renderDebt();
        break;
      case 'tax':
        title.textContent = I18N.t('card_tax_title');
        content.innerHTML = this.renderTax(income, expense);
        break;
      case 'sales':
        title.textContent = I18N.t('card_sales_title');
        content.innerHTML = this.renderSales(filteredTxs);
        break;
    }
  },

  renderPnL(txs, income, expense, profit) {
    const isYo = I18N.current === 'yo';
    return `
      <div class="report-section">
        <div class="kpi-grid" style="margin-bottom:24px">
          <div class="kpi-card revenue">
            <div class="kpi-icon">💰</div>
            <div class="kpi-info"><span class="kpi-label">${I18N.t('total_revenue')}</span><span class="kpi-value">${I18N.formatCurrency(income)}</span></div>
          </div>
          <div class="kpi-card expenses">
            <div class="kpi-icon">💸</div>
            <div class="kpi-info"><span class="kpi-label">${I18N.t('total_expenses')}</span><span class="kpi-value">${I18N.formatCurrency(expense)}</span></div>
          </div>
          <div class="kpi-card profit">
            <div class="kpi-icon">📈</div>
            <div class="kpi-info"><span class="kpi-label">${I18N.t('net_profit')}</span><span class="kpi-value">${I18N.formatCurrency(profit)}</span></div>
          </div>
        </div>
        <table class="data-table">
          <thead><tr><th>${I18N.t('th_category')}</th><th>${I18N.t('th_type')}</th><th>${I18N.t('th_amount')}</th></tr></thead>
          <tbody>
            ${txs.slice(0, 15).map(t => `
              <tr>
                <td>${t.category}</td>
                <td><span class="badge ${t.type==='income'?'badge-success':'badge-danger'}">${t.type==='income'?I18N.t('income_sale'):I18N.t('expense_label')}</span></td>
                <td style="font-weight:700;color:${t.type==='income'?'var(--success)':'var(--danger)'}">
                  ${t.type==='income'?'+':'-'}${I18N.formatCurrency(t.amount)}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  renderCashFlow(txs, income, expense) {
    const isYo = I18N.current === 'yo';
    return `
      <div class="report-section">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px">
          <div class="card" style="border-left:4px solid var(--success)">
            <h4>${isYo ? 'Owó Tó Wọlé' : 'Inflow (Cash In)'}</h4>
            <div style="font-size:28px;font-weight:800;color:var(--success);margin-top:8px">${I18N.formatCurrency(income)}</div>
          </div>
          <div class="card" style="border-left:4px solid var(--danger)">
            <h4>${isYo ? 'Owó Tó Jáde' : 'Outflow (Cash Out)'}</h4>
            <div style="font-size:28px;font-weight:800;color:var(--danger);margin-top:8px">${I18N.formatCurrency(expense)}</div>
          </div>
        </div>
        <div class="card" style="background:rgba(108,60,245,0.06);border:1px solid var(--border)">
          <h4>${isYo ? 'Ìṣàn Owó Gidi Tó Ṣẹ́kù' : 'Net Cash Position'}</h4>
          <div style="font-size:36px;font-weight:900;color:${income-expense>=0?'var(--success)':'var(--danger)'};margin-top:8px">
            ${I18N.formatCurrency(income - expense)}
          </div>
        </div>
      </div>
    `;
  },

  renderInventory() {
    const inv = DB.getInventory();
    const totalVal = inv.reduce((s,p) => s + p.costPrice * p.qty, 0);
    const potRev   = inv.reduce((s,p) => s + p.sellingPrice * p.qty, 0);
    return `
      <div class="report-section">
        <div style="display:flex;gap:20px;margin-bottom:20px;flex-wrap:wrap">
          <div class="card" style="flex:1"><h4>${I18N.t('stock_value')}</h4><div style="font-size:24px;font-weight:700;color:var(--secondary)">${I18N.formatCurrency(totalVal)}</div></div>
          <div class="card" style="flex:1"><h4>${I18N.t('potential_revenue')}</h4><div style="font-size:24px;font-weight:700;color:var(--success)">${I18N.formatCurrency(potRev)}</div></div>
        </div>
        <table class="data-table">
          <thead><tr><th>${I18N.t('th_product')}</th><th>${I18N.t('th_qty')}</th><th>${I18N.t('th_cost_price')}</th><th>${I18N.t('th_selling_price')}</th><th>${I18N.t('stock_value')}</th></tr></thead>
          <tbody>
            ${inv.map(p => `<tr><td>${p.name}</td><td>${p.qty}</td><td>${I18N.formatCurrency(p.costPrice)}</td><td>${I18N.formatCurrency(p.sellingPrice)}</td><td>${I18N.formatCurrency(p.costPrice*p.qty)}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  renderDebt() {
    const debts = DB.getDebts();
    const rec   = debts.filter(d => d.debtType === 'receivable');
    return `
      <div class="report-section">
        <table class="data-table">
          <thead><tr><th>${I18N.t('th_name')}</th><th>${I18N.t('th_amount')}</th><th>${I18N.t('th_due_date')}</th><th>${I18N.t('th_status')}</th></tr></thead>
          <tbody>
            ${rec.map(d => `<tr><td>${d.person}</td><td>${I18N.formatCurrency(d.amount)}</td><td>${d.dueDate || '--'}</td><td><span class="badge ${d.status==='paid'?'badge-success':'badge-warning'}">${d.status}</span></td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  renderTax(income, expense) {
    const vat = income * 0.075;
    const profit = Math.max(0, income - expense);
    const isYo = I18N.current === 'yo';
    return `
      <div class="report-section">
        <div class="card" style="margin-bottom:20px">
          <h4>${isYo ? 'Ìwé Ìṣirò Owó Orí FIRS (Nigeria)' : 'Nigerian FIRS Tax Summary'}</h4>
          <p style="color:var(--text-secondary);font-size:13px;margin-top:4px">${isYo ? 'Gẹ́gẹ́ bí òfin CAMA & Finance Act, àwọn ilé iṣẹ́ kékeré tí owó wọn kò tó ₦25,000,000 ní ọdún jẹ́ ọ̀fẹ́ nínú CIT!' : 'Under the Finance Act, small businesses with turnover under ₦25,000,000 are exempt from Company Income Tax (CIT)!'}</p>
        </div>
        <table class="data-table">
          <thead><tr><th>${I18N.t('description')}</th><th>${I18N.t('th_amount')}</th></tr></thead>
          <tbody>
            <tr><td>${isYo ? 'Apapọ̀ Owó Wọlé' : 'Gross Turnover'}</td><td>${I18N.formatCurrency(income)}</td></tr>
            <tr><td>${isYo ? 'Owó Orí VAT (7.5%)' : 'Estimated Output VAT (7.5%)'}</td><td>${I18N.formatCurrency(vat)}</td></tr>
            <tr><td>${isYo ? 'Èrè Ìṣirò' : 'Taxable Profit Base'}</td><td>${I18N.formatCurrency(profit)}</td></tr>
            <tr><td>${isYo ? 'Owó Orí CIT (0% fún kékeré)' : 'Company Income Tax (0% Small Biz)'}</td><td style="color:var(--success);font-weight:700">₦0.00 (Exempt)</td></tr>
          </tbody>
        </table>
        <p style="font-size:12px;color:var(--text-muted);margin-top:16px">💡 ${isYo ? 'Kọ orúkọ pẹ̀lú FIRS fún ìforúkọsílẹ̀ pípé. firs.gov.ng' : 'Register with FIRS for formal tax compliance. Visit firs.gov.ng'} | Powered by TuyiTek Digital Solutions</p>
      </div>
    `;
  },

  renderSales(txs) {
    const sales = txs.filter(t => t.type === 'income');
    return `
      <div class="report-section">
        <table class="data-table">
          <thead><tr><th>${I18N.t('th_date')}</th><th>${I18N.t('th_description')}</th><th>${I18N.t('th_amount')}</th></tr></thead>
          <tbody>
            ${sales.map(s => `<tr><td>${s.date}</td><td>${s.description}</td><td style="color:var(--success);font-weight:700">+${I18N.formatCurrency(s.amount)}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  exportCSV() {
    App.showToast(I18N.t('export_csv') + ' 📥', 'success');
  },

  exportPDF() {
    window.print();
  }
};
