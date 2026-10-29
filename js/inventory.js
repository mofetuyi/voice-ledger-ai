/* ===================================
   INVENTORY.JS - Inventory Management
   Voice Ledger AI by TuyiTek Digital Solutions
=================================== */

const Inventory = {
  editId: null,

  init() {
    this.bindEvents();
    this.populateCategories();
    this.render();
  },

  bindEvents() {
    document.getElementById('addInventoryBtn')?.addEventListener('click', () => this.showForm());
    document.getElementById('cancelInvBtn')?.addEventListener('click', () => this.hideForm());
    document.getElementById('saveInvBtn')?.addEventListener('click', () => this.save());
    document.getElementById('invSearch')?.addEventListener('input', () => this.render());
    document.getElementById('invFilterCategory')?.addEventListener('change', () => this.render());
    document.getElementById('invFilterStatus')?.addEventListener('change', () => this.render());
    document.getElementById('inventoryVoiceBtn')?.addEventListener('click', () => VoiceModule.startListening('inventory'));
  },

  showForm(product = null) {
    const form = document.getElementById('inventoryForm');
    if (!form) return;
    form.style.display = 'block';
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    if (product) {
      this.editId = product.id;
      document.getElementById('invName').value        = product.name;
      document.getElementById('invSKU').value         = product.sku || '';
      document.getElementById('invCategory').value    = product.category || '';
      document.getElementById('invQty').value         = product.qty;
      document.getElementById('invCostPrice').value   = product.costPrice;
      document.getElementById('invSellingPrice').value= product.sellingPrice;
      document.getElementById('invLowAlert').value    = product.lowAlert || 5;
      document.getElementById('invUnit').value        = product.unit || 'Pieces';
    } else {
      this.editId = null;
    }
  },

  hideForm() {
    const form = document.getElementById('inventoryForm');
    if (form) form.style.display = 'none';
    this.editId = null;
    ['invName','invSKU','invCategory','invQty','invCostPrice','invSellingPrice','invLowAlert'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  },

  save() {
    const name         = document.getElementById('invName')?.value?.trim();
    const sku          = document.getElementById('invSKU')?.value?.trim() || name.substring(0,6).toUpperCase();
    const category     = document.getElementById('invCategory')?.value?.trim() || 'General';
    const qty          = parseInt(document.getElementById('invQty')?.value) || 0;
    const costPrice    = parseFloat(document.getElementById('invCostPrice')?.value) || 0;
    const sellingPrice = parseFloat(document.getElementById('invSellingPrice')?.value) || 0;
    const lowAlert     = parseInt(document.getElementById('invLowAlert')?.value) || 5;
    const unit         = document.getElementById('invUnit')?.value || 'Pieces';

    if (!name || isNaN(qty) || costPrice < 0 || sellingPrice < 0) {
      App.showToast(I18N.t('required_fields_err'), 'error');
      return;
    }

    const product = {
      id: this.editId || DB.genId(),
      name, sku, category, qty, costPrice, sellingPrice, lowAlert, unit,
      updatedAt: new Date().toISOString()
    };

    DB.saveProduct(product);
    this.hideForm();
    this.populateCategories();
    this.render();
    App.refreshDashboard();
    Alerts.generateAlerts();
    App.showToast(I18N.t('saved_success'), 'success');
  },

  populateCategories() {
    const select = document.getElementById('invFilterCategory');
    if (!select) return;
    const inv = DB.getInventory();
    const cats = [...new Set(inv.map(p => p.category).filter(Boolean))];
    const current = select.value;
    select.innerHTML = `<option value="all">${I18N.t('all_categories')}</option>` +
      cats.map(c => `<option value="${c}" ${c===current?'selected':''}>${c}</option>`).join('');
  },

  getStatus(product) {
    if (product.qty === 0) return 'out';
    if (product.qty <= product.lowAlert) return 'low';
    return 'ok';
  },

  getStatusLabel(status) {
    if (status === 'out') return I18N.t('out_of_stock');
    if (status === 'low') return I18N.t('low_stock');
    return I18N.t('in_stock');
  },

  getFiltered() {
    let inv    = DB.getInventory();
    const search = document.getElementById('invSearch')?.value?.toLowerCase() || '';
    const cat    = document.getElementById('invFilterCategory')?.value || 'all';
    const status = document.getElementById('invFilterStatus')?.value || 'all';

    if (search) {
      inv = inv.filter(p =>
        p.name.toLowerCase().includes(search) ||
        p.sku?.toLowerCase().includes(search) ||
        p.category?.toLowerCase().includes(search)
      );
    }
    if (cat !== 'all') inv = inv.filter(p => p.category === cat);
    if (status !== 'all') inv = inv.filter(p => this.getStatus(p) === status);

    return inv;
  },

  render() {
    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody) return;

    const inv = this.getFiltered();
    this.updateKPIs();

    if (inv.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="empty-cell">${I18N.t('no_products_added')}</td></tr>`;
      return;
    }

    tbody.innerHTML = inv.map(p => {
      const status   = this.getStatus(p);
      const profitPerUnit = p.sellingPrice - p.costPrice;
      return `
        <tr>
          <td>
            <div style="font-weight:500">${this.esc(p.name)}</div>
            <div style="font-size:11px;color:var(--text-muted)">${p.unit}</div>
          </td>
          <td style="font-size:12px;color:var(--text-secondary)">${this.esc(p.sku)}</td>
          <td><span class="badge badge-neutral">${this.esc(p.category)}</span></td>
          <td style="font-weight:700;color:${p.qty === 0 ? 'var(--danger)' : p.qty <= p.lowAlert ? 'var(--warning)' : 'var(--text-primary)'}">${p.qty}</td>
          <td>${I18N.formatCurrency(p.costPrice)}</td>
          <td>${I18N.formatCurrency(p.sellingPrice)}</td>
          <td style="color:${profitPerUnit >= 0 ? 'var(--success)' : 'var(--danger)'};font-weight:600">${I18N.formatCurrency(profitPerUnit)}</td>
          <td><span class="inv-stock-badge ${status}">${this.getStatusLabel(status)}</span></td>
          <td>
            <button class="btn btn-ghost" style="padding:5px 10px;font-size:11px" onclick="Inventory.showForm(${JSON.stringify(p).replace(/"/g,'&quot;')})">${I18N.t('btn_edit')}</button>
            <button class="btn" style="padding:5px 10px;font-size:11px;background:rgba(239,68,68,0.1);color:var(--danger);border:1px solid rgba(239,68,68,0.2)" onclick="Inventory.delete('${p.id}')">${I18N.t('btn_del')}</button>
          </td>
        </tr>
      `;
    }).join('');
  },

  updateKPIs() {
    const inv = DB.getInventory();
    const stockValue      = inv.reduce((s, p) => s + p.costPrice * p.qty, 0);
    const lowCount        = inv.filter(p => p.qty <= p.lowAlert && p.qty > 0).length;
    const potentialRev    = inv.reduce((s, p) => s + p.sellingPrice * p.qty, 0);

    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    el('invTotalProducts',   inv.length);
    el('invStockValue',      I18N.formatCurrency(stockValue));
    el('invLowStockCount',   lowCount);
    el('invPotentialRevenue',I18N.formatCurrency(potentialRev));
  },

  delete(id) {
    if (confirm(I18N.t('confirm_delete'))) {
      DB.deleteProduct(id);
      this.populateCategories();
      this.render();
      App.refreshDashboard();
      Alerts.generateAlerts();
      App.showToast(I18N.t('deleted_success'), 'info');
    }
  },

  esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
};
