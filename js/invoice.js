/* ===================================
   INVOICE.JS - Invoice Generator
=================================== */

const InvoiceModule = {
  currentInvoice: null,
  lineItemCounter: 1,

  init() {
    this.bindEvents();
    this.setDefaults();
    this.updatePreview();
  },

  bindEvents() {
    document.getElementById('addLineItem')?.addEventListener('click', () => this.addLineItem());
    document.getElementById('newInvoiceBtn')?.addEventListener('click', () => this.newInvoice());
    document.getElementById('previewInvoiceBtn')?.addEventListener('click', () => this.updatePreview());
    document.getElementById('saveInvoiceDraftBtn')?.addEventListener('click', () => this.saveDraft());
    document.getElementById('downloadInvoiceBtn')?.addEventListener('click', () => this.downloadPDF());
    document.getElementById('invTax')?.addEventListener('input', () => this.calculateTotals());
    document.getElementById('invDiscount')?.addEventListener('input', () => this.calculateTotals());

    // Line item events
    document.getElementById('lineItems')?.addEventListener('input', (e) => {
      if (e.target.classList.contains('li-qty') || e.target.classList.contains('li-price')) {
        this.calculateLineTotal(e.target.closest('.line-item'));
        this.calculateTotals();
      }
    });

    document.getElementById('lineItems')?.addEventListener('click', (e) => {
      if (e.target.classList.contains('li-remove')) {
        e.target.closest('.line-item')?.remove();
        this.calculateTotals();
      }
    });

    // Live preview update
    ['clientName','clientAddress','invIssueDate','invDueDate','invNotes'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', () => this.updatePreview());
    });
  },

  setDefaults() {
    const today = new Date().toISOString().split('T')[0];
    const due   = new Date(Date.now() + 30*86400000).toISOString().split('T')[0];

    const invNo = document.getElementById('invNo');
    if (invNo) invNo.value = 'INV-' + Date.now().toString().slice(-6);

    const issueDate = document.getElementById('invIssueDate');
    if (issueDate) issueDate.value = today;

    const dueDate = document.getElementById('invDueDate');
    if (dueDate) dueDate.value = due;
  },

  newInvoice() {
    this.currentInvoice = null;
    this.setDefaults();
    document.getElementById('clientName').value    = '';
    document.getElementById('clientPhone').value   = '';
    document.getElementById('clientAddress').value = '';
    document.getElementById('invNotes').value      = '';
    document.getElementById('invTax').value        = '0';
    document.getElementById('invDiscount').value   = '0';
    document.getElementById('lineItems').innerHTML = '';
    this.lineItemCounter = 1;
    this.addLineItem();
    this.calculateTotals();
    this.updatePreview();
    App.showToast('New invoice created!', 'info');
  },

  addLineItem() {
    const id   = ++this.lineItemCounter;
    const div  = document.createElement('div');
    div.className = 'line-item';
    div.dataset.id = id;
    div.innerHTML = `
      <input type="text" placeholder="Description" class="li-desc" />
      <input type="number" placeholder="Qty" class="li-qty" min="1" value="1" />
      <input type="number" placeholder="Unit Price ₦" class="li-price" min="0" />
      <span class="li-total">₦0.00</span>
      <button class="li-remove" title="Remove item">✕</button>
    `;
    document.getElementById('lineItems')?.appendChild(div);
  },

  calculateLineTotal(lineItem) {
    if (!lineItem) return 0;
    const qty   = parseFloat(lineItem.querySelector('.li-qty')?.value) || 0;
    const price = parseFloat(lineItem.querySelector('.li-price')?.value) || 0;
    const total = qty * price;
    const totalEl = lineItem.querySelector('.li-total');
    if (totalEl) totalEl.textContent = I18N.formatCurrency(total);
    return total;
  },

  calculateTotals() {
    const lineItems = document.querySelectorAll('#lineItems .line-item');
    let subtotal = 0;
    lineItems.forEach(li => { subtotal += this.calculateLineTotal(li); });

    const taxPct      = parseFloat(document.getElementById('invTax')?.value) || 0;
    const discountPct = parseFloat(document.getElementById('invDiscount')?.value) || 0;
    const discount    = subtotal * (discountPct / 100);
    const taxable     = subtotal - discount;
    const tax         = taxable * (taxPct / 100);
    const total       = taxable + tax;

    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    el('invSubtotal', I18N.formatCurrency(subtotal));
    el('invTotal',    I18N.formatCurrency(total));
    el('prevSubtotal',I18N.formatCurrency(subtotal));
    el('prevTotal',   I18N.formatCurrency(total));

    return { subtotal, tax, discount, total };
  },

  updatePreview() {
    const business = DB.getBusiness();
    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };

    el('prevBusinessName', business.name || 'Your Business');
    el('prevBusinessAddr', business.phone || '');
    el('prevInvNo',   document.getElementById('invNo')?.value || '');
    el('prevDate',    document.getElementById('invIssueDate')?.value || '');
    el('prevDue',     document.getElementById('invDueDate')?.value || '');
    el('prevClientName', document.getElementById('clientName')?.value || 'Client Name');
    el('prevClientAddr', document.getElementById('clientAddress')?.value || '');
    el('prevNotes',   document.getElementById('invNotes')?.value || '');

    // Render line items in preview
    const prevBody = document.getElementById('prevLineItems');
    if (prevBody) {
      const lineItems = document.querySelectorAll('#lineItems .line-item');
      prevBody.innerHTML = Array.from(lineItems).map(li => {
        const desc  = li.querySelector('.li-desc')?.value || '';
        const qty   = li.querySelector('.li-qty')?.value || 1;
        const price = parseFloat(li.querySelector('.li-price')?.value) || 0;
        const total = parseFloat(qty) * price;
        return `<tr>
          <td>${this.esc(desc)}</td>
          <td style="text-align:center">${qty}</td>
          <td style="text-align:right">${I18N.formatCurrency(price)}</td>
          <td style="text-align:right;font-weight:600">${I18N.formatCurrency(total)}</td>
        </tr>`;
      }).join('');
    }

    this.calculateTotals();
  },

  saveDraft() {
    const invoice = this.buildInvoiceData('draft');
    DB.saveInvoice(invoice);
    this.currentInvoice = invoice;
    App.showToast(I18N.t('saved_success'), 'success');
  },

  buildInvoiceData(status = 'draft') {
    const lineItems = Array.from(document.querySelectorAll('#lineItems .line-item')).map(li => ({
      desc:  li.querySelector('.li-desc')?.value || '',
      qty:   parseFloat(li.querySelector('.li-qty')?.value) || 1,
      price: parseFloat(li.querySelector('.li-price')?.value) || 0
    }));

    return {
      id:          this.currentInvoice?.id || DB.genId(),
      invoiceNo:   document.getElementById('invNo')?.value || '',
      clientName:  document.getElementById('clientName')?.value || '',
      clientPhone: document.getElementById('clientPhone')?.value || '',
      clientAddr:  document.getElementById('clientAddress')?.value || '',
      issueDate:   document.getElementById('invIssueDate')?.value || '',
      dueDate:     document.getElementById('invDueDate')?.value || '',
      status:      document.getElementById('invStatus')?.value || status,
      lineItems,
      taxPct:      parseFloat(document.getElementById('invTax')?.value) || 0,
      discountPct: parseFloat(document.getElementById('invDiscount')?.value) || 0,
      notes:       document.getElementById('invNotes')?.value || '',
      totals:      this.calculateTotals(),
      createdAt:   new Date().toISOString()
    };
  },

  downloadPDF() {
    this.updatePreview();

    const content = document.getElementById('invPreviewContent');
    if (!content) { App.showToast('Preview not found.', 'error'); return; }

    // Use browser print for PDF
    const printWindow = window.open('', '_blank');
    const business = DB.getBusiness();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice ${document.getElementById('invNo')?.value}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Outfit:wght@700;900&display=swap" rel="stylesheet">
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family: 'Inter', sans-serif; background: white; color: #1a1a2e; padding: 40px; }
          .inv-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #6c3cf5; }
          .inv-brand { display: flex; align-items: center; gap: 14px; }
          .inv-logo { width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #6c3cf5, #06b6d4); display: flex; align-items: center; justify-content: center; font-family: 'Outfit', sans-serif; font-size: 24px; font-weight: 800; color: white; }
          .inv-meta h1 { font-family: 'Outfit', sans-serif; font-size: 36px; font-weight: 900; color: #6c3cf5; }
          .inv-meta p { color: #666; font-size: 13px; }
          .bill-to { margin-bottom: 28px; }
          .bill-to strong { font-size: 11px; text-transform: uppercase; color: #999; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #f8f9fa; padding: 10px 14px; text-align: left; font-size: 11px; text-transform: uppercase; color: #999; border-bottom: 1px solid #eee; }
          td { padding: 12px 14px; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
          .totals { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; margin-top: 16px; }
          .totals .grand-total { font-size: 20px; font-weight: 700; color: #6c3cf5; }
          .footer { text-align: center; margin-top: 48px; color: #999; font-size: 11px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="inv-header">
          <div class="inv-brand">
            <div class="inv-logo">TT</div>
            <div>
              <h2 style="font-family:Outfit;font-size:18px;font-weight:700">${business.name || 'Your Business'}</h2>
              <p style="font-size:12px;color:#666">${business.phone || ''}</p>
            </div>
          </div>
          <div class="inv-meta" style="text-align:right">
            <h1>INVOICE</h1>
            <p>#${document.getElementById('invNo')?.value}</p>
            <p>Date: ${document.getElementById('invIssueDate')?.value}</p>
            <p>Due: ${document.getElementById('invDueDate')?.value}</p>
          </div>
        </div>
        <div class="bill-to">
          <strong>Bill To:</strong>
          <p style="font-size:16px;font-weight:600;margin-top:4px">${document.getElementById('clientName')?.value || '--'}</p>
          <p style="font-size:13px;color:#666">${document.getElementById('clientAddress')?.value || ''}</p>
          <p style="font-size:13px;color:#666">${document.getElementById('clientPhone')?.value || ''}</p>
        </div>
        <table>
          <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
          <tbody>
            ${Array.from(document.querySelectorAll('#lineItems .line-item')).map(li => {
              const desc = li.querySelector('.li-desc')?.value || '';
              const qty  = li.querySelector('.li-qty')?.value || 1;
              const price= parseFloat(li.querySelector('.li-price')?.value) || 0;
              return `<tr><td>${desc}</td><td>${qty}</td><td>₦${price.toLocaleString()}</td><td>₦${(qty*price).toLocaleString()}</td></tr>`;
            }).join('')}
          </tbody>
        </table>
        <div class="totals">
          <div>Subtotal: <strong>₦${document.getElementById('invSubtotal')?.textContent.replace('₦','')}</strong></div>
          <div class="grand-total">Total: ${document.getElementById('invTotal')?.textContent}</div>
        </div>
        ${document.getElementById('invNotes')?.value ? `<p style="margin-top:24px;font-size:12px;color:#666;border-top:1px solid #eee;padding-top:16px">${document.getElementById('invNotes').value}</p>` : ''}
        <div class="footer">Generated by Voice Ledger AI · TuyiTek Digital Solutions · ${new Date().toLocaleDateString()}</div>
        <script>window.onload = function(){ window.print(); }<\/script>
      </body>
      </html>
    `);
    printWindow.document.close();

    const invoice = this.buildInvoiceData('sent');
    DB.saveInvoice(invoice);
    App.showToast('Invoice ready to download! 🧾', 'success');
  },

  esc(str) { return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
};
