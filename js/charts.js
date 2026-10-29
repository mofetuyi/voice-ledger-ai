/* ===================================
   CHARTS.JS - Chart.js Integration
   Voice Ledger AI by TuyiTek Digital Solutions
=================================== */

const Charts = {
  instances: {},

  get defaultOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 800, easing: 'easeInOutQuart' },
      plugins: {
        legend: {
          labels: { color: '#94a3b8', font: { family: 'Inter', size: 12 }, boxWidth: 12, padding: 16 }
        },
        tooltip: {
          backgroundColor: '#0d1526',
          borderColor: 'rgba(108,60,245,0.3)',
          borderWidth: 1,
          titleColor: '#f1f5f9',
          bodyColor: '#94a3b8',
          padding: 12,
          callbacks: {
            label: (ctx) => ` ₦${Number(ctx.raw || 0).toLocaleString()}`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#475569', font: { size: 11 }, maxRotation: 0 },
          grid: { color: 'rgba(255,255,255,0.04)' },
          border: { color: 'rgba(255,255,255,0.06)' }
        },
        y: {
          ticks: { color: '#475569', font: { size: 11 }, callback: v => '₦' + Number(v).toLocaleString() },
          grid: { color: 'rgba(255,255,255,0.04)' },
          border: { color: 'rgba(255,255,255,0.06)' }
        }
      }
    };
  },

  destroy(id) {
    if (this.instances[id]) {
      this.instances[id].destroy();
      delete this.instances[id];
    }
  },

  // Revenue vs Expenses Line Chart
  renderRevenueChart(days = 30) {
    const data = DB.getDailyData(days);
    const locale = I18N.current === 'yo' ? 'yo-NG' : 'en-NG';
    const labels = data.map(d => {
      const date = new Date(d.date);
      return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
    });

    this.destroy('revenueChart');
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;

    this.instances['revenueChart'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: I18N.t('total_revenue'),
            data: data.map(d => d.income),
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34,197,94,0.08)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: '#22c55e'
          },
          {
            label: I18N.t('total_expenses'),
            data: data.map(d => d.expense),
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239,68,68,0.06)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: '#ef4444'
          }
        ]
      },
      options: { ...this.defaultOptions }
    });
  },

  // Income by Category Pie
  renderIncomePie() {
    const txs = DB.getTransactions().filter(t => t.type === 'income');
    const categoryMap = {};
    txs.forEach(t => {
      const key = t.category || 'other';
      const catLabel = I18N.t('cat_' + key) || key;
      categoryMap[catLabel] = (categoryMap[catLabel] || 0) + t.amount;
    });

    const labels = Object.keys(categoryMap);
    const values = Object.values(categoryMap);

    this.destroy('incomePieChart');
    const ctx = document.getElementById('incomePieChart');
    if (!ctx) return;

    this.instances['incomePieChart'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels.length ? labels : [I18N.t('no_tx_found')],
        datasets: [{
          data: values.length ? values : [1],
          backgroundColor: ['#6c3cf5','#22c55e','#06b6d4','#f59e0b','#ec4899','#8b5cf6','#3b82f6'],
          borderColor: '#0d1526',
          borderWidth: 2
        }]
      },
      options: {
        ...this.defaultOptions,
        scales: {},
        plugins: {
          ...this.defaultOptions.plugins,
          legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 10, padding: 10 } }
        }
      }
    });
  },

  // Expense by Category Pie
  renderExpensePie() {
    const txs = DB.getTransactions().filter(t => t.type === 'expense');
    const categoryMap = {};
    txs.forEach(t => {
      const key = t.category || 'other';
      const catLabel = I18N.t('cat_' + key) || key;
      categoryMap[catLabel] = (categoryMap[catLabel] || 0) + t.amount;
    });

    const labels = Object.keys(categoryMap);
    const values = Object.values(categoryMap);

    this.destroy('expensePieChart');
    const ctx = document.getElementById('expensePieChart');
    if (!ctx) return;

    this.instances['expensePieChart'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels.length ? labels : [I18N.t('no_tx_found')],
        datasets: [{
          data: values.length ? values : [1],
          backgroundColor: ['#ef4444','#f59e0b','#ec4899','#8b5cf6','#06b6d4','#22c55e','#3b82f6'],
          borderColor: '#0d1526',
          borderWidth: 2
        }]
      },
      options: {
        ...this.defaultOptions,
        scales: {},
        plugins: {
          ...this.defaultOptions.plugins,
          legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 10, padding: 10 } }
        }
      }
    });
  },

  // Monthly Trend Bar Chart
  renderPnlTrend() {
    const months = [];
    const income = [];
    const expense = [];
    const txs = DB.getTransactions();
    const locale = I18N.current === 'yo' ? 'yo-NG' : 'en-NG';

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toISOString().substring(0, 7);
      const label = d.toLocaleDateString(locale, { month: 'short' });
      months.push(label);

      const monthTxs = txs.filter(t => t.date && t.date.startsWith(key));
      income.push(monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0));
      expense.push(monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0));
    }

    this.destroy('pnlTrendChart');
    const ctx = document.getElementById('pnlTrendChart');
    if (!ctx) return;

    this.instances['pnlTrendChart'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          {
            label: I18N.t('total_income_label'),
            data: income,
            backgroundColor: 'rgba(34,197,94,0.7)',
            borderColor: '#22c55e',
            borderWidth: 1,
            borderRadius: 6
          },
          {
            label: I18N.t('total_expense_label'),
            data: expense,
            backgroundColor: 'rgba(239,68,68,0.7)',
            borderColor: '#ef4444',
            borderWidth: 1,
            borderRadius: 6
          }
        ]
      },
      options: { ...this.defaultOptions }
    });
  },

  renderPnLCharts() {
    this.renderIncomePie();
    this.renderExpensePie();
    this.renderPnlTrend();
  },

  // Reports overview chart
  renderReportsChart() {
    const data = DB.getDailyData(30);
    const locale = I18N.current === 'yo' ? 'yo-NG' : 'en-NG';
    const labels = data.map(d => {
      const date = new Date(d.date);
      return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
    });

    this.destroy('reportsChart');
    const ctx = document.getElementById('reportsChart');
    if (!ctx) return;

    const profits = data.map(d => d.income - d.expense);

    this.instances['reportsChart'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: I18N.t('total_revenue'),
            data: data.map(d => d.income),
            borderColor: '#6c3cf5',
            backgroundColor: 'rgba(108,60,245,0.08)',
            fill: true, tension: 0.4, borderWidth: 2, pointRadius: 2
          },
          {
            label: I18N.t('total_expenses'),
            data: data.map(d => d.expense),
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239,68,68,0.05)',
            fill: true, tension: 0.4, borderWidth: 2, pointRadius: 2
          },
          {
            label: I18N.t('net_profit'),
            data: profits,
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34,197,94,0.05)',
            fill: true, tension: 0.4, borderWidth: 2, pointRadius: 2
          }
        ]
      },
      options: { ...this.defaultOptions }
    });
  }
};
