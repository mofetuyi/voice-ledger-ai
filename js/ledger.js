/* ===================================
   LEDGER.JS - Smart Ledger Module
   Voice Ledger AI by TuyiTek Digital Solutions
=================================== */

const Ledger = {
  editId: null,

  init() {
    this.bindEvents();
    this.render();
  },

  bindEvents() {
    document.getElementById('addTransactionBtn')?.addEventListener('click', () => this.showForm());
    document.getElementById('cancelTxBtn')?.addEventListener('click', () => this.hideForm());
    document.getElementById('saveTxBtn')?.addEventListener('click', () => this.save());
    document.getElementById('ledgerSearch')?.addEventListener('input', () => this.render());
    document.getElementById('ledgerFilterType')?.addEventListener('change', () => this.render());
    document.getElementById('ledgerFilterPeriod')?.addEventListener('change', () => this.render());
    document.getElementById('exportLedgerBtn')?.addEventListener('click', () => this.exportCSV());
    document.getElementById('ledgerVoiceBtn')?.addEventListener('click', () => VoiceModule.startListening('ledger'));

    // Set today's date as default
    const txDate = document.getElementById('txDate');
    if (txDate) txDate.value = new Date().toISOString().split('T')[0];
  },

  showForm(tx = null) {
    const form = document.getElementById('transactionForm');
    if (!form) return;
    form.style.display = 'block';
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    if (tx) {
      this.editId = tx.id;
      document.getElementById('txType').value       = tx.type;
      document.getElementById('txAmount').value     = tx.amount;
      document.getElementById('txCategory').value   = tx.category;
      document.getElementById('txDate').value       = tx.date;
      document.getElementById('txDescription').value= tx.description;
      document.getElementById('txCustomer').value   = tx.customer || '';
      document.getElementById('txPayment').value    = tx.payment;
    } else {
      this.editId = null;
      document.getElementById('txDate').value = new Date().toISOString().split('T')[0];
    }
  },

  hideForm() {
    const form = document.getElementById('transactionForm');
    if (form) form.style.display = 'none';
    this.editId = null;
    ['txType','txAmount','txCategory','txDescription','txCustomer','txPayment'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.tagName === 'INPUT') el.value = '';
    });
  },

  save() {
    const type        = document.getElementById('txType')?.value;
    const amount      = parseFloat(document.getElementById('txAmount')?.value);
    const category    = document.getElementById('txCategory')?.value;
    const date        = document.getElementById('txDate')?.value;
    const description = document.getElementById('txDescription')?.value?.trim();
    const customer    = document.getElementById('txCustomer')?.value?.trim();
    const payment     = document.getElementById('txPayment')?.value;

    if (!amount || amount <= 0 || !description || !date) {
      App.showToast(I18N.t('required_fields_err'), 'error');
      return;
    }

    const tx = {
      id: this.editId || DB.genId(),
      type, amount, category, date, description, customer, payment,
      createdAt: new Date().toISOString()
    };

    DB.saveTransaction(tx);
    this.hideForm();
    this.render();
    App.refreshDashboard();
    Alerts.generateAlerts();
    App.showToast(I18N.t('saved_success'), 'success');
  },

  getFiltered() {
    let txs = DB.getTransactions();
    const search = document.getElementById('ledgerSearch')?.value?.toLowerCase() || '';
    const type   = document.getElementById('ledgerFilterType')?.value || 'all';
    const period = document.getElementById('ledgerFilterPeriod')?.value || 'all';

    if (search) {
      txs = txs.filter(t =>
        t.description?.toLowerCase().includes(search) ||
        t.customer?.toLowerCase().includes(search) ||
        t.category?.toLowerCase().includes(search)
      );
    }
    if (type !== 'all') txs = txs.filter(t => t.type === type);

    const today = new Date().toISOString().split('T')[0];
    const week  = new Date(Date.now() - 7*86400000).toISOString().split('T')[0];
    const month = new Date().toISOString().substring(0, 7);
    if (period === 'today') txs = txs.filter(t => t.date === today);
    else if (period === 'week')  txs = txs.filter(t => t.date >= week);
    else if (period === 'month') txs = txs.filter(t => t.date?.startsWith(month));

    return txs;
  },

  render() {
    const tbody = document.getElementById('ledgerTableBody');
    if (!tbody) return;

    const txs = this.getFiltered();

    if (txs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-cell">${I18N.t('no_tx_found')}</td></tr>`;
      return;
    }

    tbody.innerHTML = txs.map(tx => {
      const typeBadge = tx.type === 'income' ? I18N.t('income_badge') : I18N.t('expense_badge');
      const paymentLabel = I18N.t(tx.payment) || tx.payment || 'cash';
      const categoryKey = 'cat_' + tx.category;
      const categoryLabel = I18N.t(categoryKey) || tx.category;

      return `
        <tr>
          <td>${new Date(tx.date).toLocaleDateString(I18N.current === 'yo' ? 'yo-NG' : 'en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
          <td>
            <div style="font-weight:500">${this.escapeHtml(tx.description)}</div>
            ${tx.customer ? `<div style="font-size:11px;color:var(--text-muted)">${this.escapeHtml(tx.customer)}</div>` : ''}
          </td>
          <td><span class="badge badge-neutral">${categoryLabel}</span></td>
          <td>
            <span class="badge ${tx.type === 'income' ? 'badge-success' : 'badge-danger'}">
              ${typeBadge}
            </span>
          </td>
          <td><span style="font-size:12px;color:var(--text-secondary)">${paymentLabel}</span></td>
          <td style="font-weight:700;color:${tx.type === 'income' ? 'var(--success)' : 'var(--danger)'}">
            ${tx.type === 'income' ? '+' : '-'}${I18N.formatCurrency(tx.amount)}
          </td>
          <td>
            <button class="btn btn-ghost" style="padding:5px 10px;font-size:11px" onclick="Ledger.showForm(${JSON.stringify(tx).replace(/"/g, '&quot;')})">${I18N.t('btn_edit')}</button>
            <button class="btn" style="padding:5px 10px;font-size:11px;background:rgba(239,68,68,0.1);color:var(--danger);border:1px solid rgba(239,68,68,0.2)" onclick="Ledger.delete('${tx.id}')">${I18N.t('btn_del')}</button>
          </td>
        </tr>
      `;
    }).join('');
  },

  delete(id) {
    if (confirm(I18N.t('confirm_delete'))) {
      DB.deleteTransaction(id);
      this.render();
      App.refreshDashboard();
      Alerts.generateAlerts();
      App.showToast(I18N.t('deleted_success'), 'info');
    }
  },

  exportCSV() {
    const txs = this.getFiltered();
    if (!txs.length) { App.showToast(I18N.t('no_tx_found'), 'warning'); return; }

    const headers = [I18N.t('th_date'), I18N.t('th_description'), I18N.t('th_category'), I18N.t('th_type'), I18N.t('th_payment'), I18N.t('th_amount'), I18N.t('customer_vendor')];
    const rows = txs.map(t => [
      t.date, `"${t.description}"`, t.category, t.type, t.payment, t.amount, `"${t.customer || ''}"`
    ]);

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `ledger-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    App.showToast(I18N.t('export_csv') + ' ✅', 'success');
  },

  escapeHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },

  // Add transaction from voice
  addFromVoice({ type, amount, description, category }) {
    const tx = {
      id: DB.genId(),
      type: type || 'income',
      amount: parseFloat(amount) || 0,
      category: category || 'sales',
      date: new Date().toISOString().split('T')[0],
      description: description || 'Voice entry',
      customer: '', payment: 'cash',
      createdAt: new Date().toISOString()
    };
    DB.saveTransaction(tx);
    this.render();
    App.refreshDashboard();
    return tx;
  }
};
