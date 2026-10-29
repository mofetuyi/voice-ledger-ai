/* ===================================
   DEBTS.JS - Debt Manager Module
   Voice Ledger AI by TuyiTek Digital Solutions
=================================== */

const DebtManager = {
  currentTab: 'owed-to-me',
  editId: null,

  init() {
    this.bindEvents();
    this.render();
  },

  bindEvents() {
    document.getElementById('addDebtBtn')?.addEventListener('click', () => this.showForm());
    document.getElementById('cancelDebtBtn')?.addEventListener('click', () => this.hideForm());
    document.getElementById('saveDebtBtn')?.addEventListener('click', () => this.save());

    document.querySelectorAll('.debt-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.currentTab = tab.dataset.tab;
        document.querySelectorAll('.debt-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.render();
      });
    });

    const debtDate = document.getElementById('debtDate');
    if (debtDate) debtDate.value = new Date().toISOString().split('T')[0];
  },

  showForm(debt = null) {
    const form = document.getElementById('debtForm');
    if (!form) return;
    form.style.display = 'block';
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    if (debt) {
      this.editId = debt.id;
      document.getElementById('debtType').value       = debt.debtType;
      document.getElementById('debtPerson').value     = debt.person;
      document.getElementById('debtPhone').value      = debt.phone || '';
      document.getElementById('debtAmount').value     = debt.amount;
      document.getElementById('debtDate').value       = debt.date;
      document.getElementById('debtDue').value        = debt.dueDate || '';
      document.getElementById('debtDescription').value= debt.description || '';
    } else {
      this.editId = null;
      document.getElementById('debtType').value = this.currentTab === 'i-owe' ? 'payable' : 'receivable';
    }
  },

  hideForm() {
    const form = document.getElementById('debtForm');
    if (form) form.style.display = 'none';
    this.editId = null;
    ['debtPerson','debtPhone','debtAmount','debtDue','debtDescription'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  },

  save() {
    const debtType    = document.getElementById('debtType')?.value;
    const person      = document.getElementById('debtPerson')?.value?.trim();
    const phone       = document.getElementById('debtPhone')?.value?.trim();
    const amount      = parseFloat(document.getElementById('debtAmount')?.value);
    const date        = document.getElementById('debtDate')?.value;
    const dueDate     = document.getElementById('debtDue')?.value;
    const description = document.getElementById('debtDescription')?.value?.trim();

    if (!person || !amount || amount <= 0 || !date) {
      App.showToast(I18N.t('required_fields_err'), 'error');
      return;
    }

    const debt = {
      id: this.editId || DB.genId(),
      debtType, person, phone, amount, date, dueDate, description,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    DB.saveDebt(debt);
    this.hideForm();
    this.render();
    App.refreshDashboard();
    Alerts.generateAlerts();
    App.showToast(I18N.t('saved_success'), 'success');
  },

  getDebtsByTab() {
    const all = DB.getDebts();
    const type = this.currentTab === 'owed-to-me' ? 'receivable' : 'payable';
    return all.filter(d => d.debtType === type);
  },

  isOverdue(debt) {
    if (debt.status === 'paid' || !debt.dueDate) return false;
    return new Date(debt.dueDate) < new Date();
  },

  render() {
    const tbody = document.getElementById('debtsTableBody');
    if (!tbody) return;

    const debts = this.getDebtsByTab();
    this.updateKPIs();

    if (debts.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-cell">${I18N.t('no_debt_records')}</td></tr>`;
      return;
    }

    const biz = DB.getBusiness();

    tbody.innerHTML = debts.map(d => {
      const overdue = this.isOverdue(d);
      const statusClass = d.status === 'paid' ? 'badge-success' : overdue ? 'badge-danger' : 'badge-warning';
      const statusLabel = d.status === 'paid' ? I18N.t('status_paid') : overdue ? I18N.t('status_overdue') : I18N.t('status_pending');

      const waPhone = (d.phone || '').replace(/\D/g, '');
      const waMsg = encodeURIComponent(
        I18N.current === 'yo'
          ? `Ẹ kú ọjọ́ méjì o, ${d.person}. Ẹ jọ̀wọ́ mo rán yín létí nípa owó ${I18N.formatCurrency(d.amount)} tí ẹ jẹ ${biz.name || 'iṣòwò wa'}. Ẹ ṣeun fún àkókò yín!`
          : `Hello ${d.person}, friendly reminder from ${biz.name || 'our business'} regarding the balance of ${I18N.formatCurrency(d.amount)}. Kindly let us know when payment will be made. Thank you!`
      );

      return `
        <tr>
          <td>
            <div style="font-weight:500">${this.esc(d.person)}</div>
            <div style="font-size:11px;color:var(--text-muted)">${this.esc(d.description)}</div>
          </td>
          <td>
            ${d.phone ? `<a href="tel:${d.phone}" style="color:var(--primary-light);font-size:13px">${this.esc(d.phone)}</a>` : '--'}
            ${d.phone && d.debtType === 'receivable' && d.status !== 'paid' ? `
              <br/><a href="https://wa.me/${waPhone}?text=${waMsg}" target="_blank" style="font-size:11px; color:var(--success); text-decoration:none;">📲 WhatsApp</a>
            ` : ''}
          </td>
          <td style="font-weight:700;color:${d.debtType === 'receivable' ? 'var(--success)' : 'var(--danger)'}">
            ${I18N.formatCurrency(d.amount)}
          </td>
          <td style="font-size:12px">${new Date(d.date).toLocaleDateString(I18N.current === 'yo' ? 'yo-NG' : 'en-NG')}</td>
          <td style="font-size:12px;color:${overdue ? 'var(--danger)' : 'var(--text-secondary)'}">
            ${d.dueDate ? new Date(d.dueDate).toLocaleDateString(I18N.current === 'yo' ? 'yo-NG' : 'en-NG') : '--'}
            ${overdue ? ' ⚠️' : ''}
          </td>
          <td><span class="badge ${statusClass}">${statusLabel}</span></td>
          <td>
            ${d.status !== 'paid' ? `<button class="btn btn-ghost" style="padding:5px 8px;font-size:11px" onclick="DebtManager.markPaid('${d.id}')">${I18N.t('mark_paid')}</button>` : ''}
            <button class="btn btn-ghost" style="padding:5px 8px;font-size:11px" onclick="DebtManager.showForm(${JSON.stringify(d).replace(/"/g,'&quot;')})">${I18N.t('btn_edit')}</button>
            <button class="btn" style="padding:5px 8px;font-size:11px;background:rgba(239,68,68,0.1);color:var(--danger);border:1px solid rgba(239,68,68,0.2)" onclick="DebtManager.delete('${d.id}')">${I18N.t('btn_del')}</button>
          </td>
        </tr>
      `;
    }).join('');
  },

  markPaid(id) {
    DB.updateDebtStatus(id, 'paid');
    this.render();
    this.updateKPIs();
    Alerts.generateAlerts();
    App.showToast(I18N.t('status_paid') + ' ✅', 'success');
  },

  delete(id) {
    if (confirm(I18N.t('confirm_delete'))) {
      DB.deleteDebt(id);
      this.render();
      this.updateKPIs();
      App.showToast(I18N.t('deleted_success'), 'info');
    }
  },

  updateKPIs() {
    const data       = DB.getAnalytics();
    const debts      = DB.getDebts();
    const overdue    = debts.filter(d => this.isOverdue(d)).length;

    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    el('totalReceivable', I18N.formatCurrency(data.receivable));
    el('totalPayable',    I18N.formatCurrency(data.payable));
    el('overdueDebts',    overdue);
    el('netDebtPosition', I18N.formatCurrency(data.netDebt));
  },

  esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
};
