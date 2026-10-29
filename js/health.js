/* ===================================
   HEALTH.JS - Business Health Score
   Voice Ledger AI by TuyiTek Digital Solutions
=================================== */

const HealthScore = {
  calculate() {
    const data = DB.getAnalytics();
    const txs  = DB.getTransactions();
    const inv  = DB.getInventory();

    let score = 0;
    const metrics = {};

    // 1. Profit Margin (0–25 pts)
    const margin = data.income > 0 ? (data.profit / data.income) * 100 : 0;
    const marginScore = Math.min(25, Math.max(0, margin * 0.5));
    metrics.margin = { score: marginScore, max: 25, pct: (marginScore / 25) * 100 };
    score += marginScore;

    // 2. Revenue Growth (0–20 pts)
    const now   = Date.now();
    const last30 = txs.filter(t => t.type === 'income' && new Date(t.date) >= new Date(now - 30*86400000));
    const prev30 = txs.filter(t => t.type === 'income' && new Date(t.date) >= new Date(now - 60*86400000) && new Date(t.date) < new Date(now - 30*86400000));
    const last30Rev = last30.reduce((s, t) => s + t.amount, 0);
    const prev30Rev = prev30.reduce((s, t) => s + t.amount, 0);
    const growth    = prev30Rev > 0 ? ((last30Rev - prev30Rev) / prev30Rev) * 100 : (last30Rev > 0 ? 50 : 0);
    const growthScore = Math.min(20, Math.max(0, 10 + growth * 0.2));
    metrics.revenue = { score: growthScore, max: 20, pct: (growthScore / 20) * 100 };
    score += growthScore;

    // 3. Inventory Health (0–15 pts)
    let invScore = 15;
    if (inv.length === 0) invScore = 5;
    else {
      const outOfStock = inv.filter(p => p.qty === 0).length;
      const lowStock   = inv.filter(p => p.qty > 0 && p.qty <= p.lowAlert).length;
      invScore = Math.max(0, 15 - (outOfStock * 3) - (lowStock * 1.5));
    }
    metrics.inventory = { score: invScore, max: 15, pct: (invScore / 15) * 100 };
    score += invScore;

    // 4. Debt Ratio (0–15 pts)
    const receivable = data.receivable;
    const payable    = data.payable;
    let debtScore    = 15;
    if (data.income > 0) {
      const debtRatio = payable / data.income;
      debtScore = Math.max(0, 15 - debtRatio * 15);
    }
    if (payable > receivable * 2) debtScore = Math.max(0, debtScore - 5);
    metrics.debt = { score: debtScore, max: 15, pct: (debtScore / 15) * 100 };
    score += debtScore;

    // 5. Transaction Activity (0–15 pts)
    const actScore = Math.min(15, txs.length * 1.5);
    metrics.activity = { score: actScore, max: 15, pct: (actScore / 15) * 100 };
    score += actScore;

    // 6. Cash Flow (0–10 pts)
    const cfScore = data.profit >= 0 ? Math.min(10, 5 + (data.profit / (data.income || 1)) * 5) : 0;
    metrics.cashflow = { score: cfScore, max: 10, pct: (cfScore / 10) * 100 };
    score += cfScore;

    this._lastMetrics = metrics;
    return Math.min(100, Math.max(0, score));
  },

  getVerdict(score) {
    if (score >= 85) return { label: I18N.t('verdict_excellent'), color: 'var(--success)' };
    if (score >= 70) return { label: I18N.t('verdict_good'),      color: 'var(--success)' };
    if (score >= 55) return { label: I18N.t('verdict_fair'),      color: 'var(--warning)' };
    if (score >= 40) return { label: I18N.t('verdict_needs_work'), color: 'var(--warning)' };
    return                  { label: I18N.t('verdict_critical'),   color: 'var(--danger)' };
  },

  getRecommendations(score) {
    const isYo = I18N.current === 'yo';
    const recs = [];
    const data = DB.getAnalytics();
    const inv  = DB.getInventory();

    if (data.profit < 0) {
      recs.push({
        icon: '💡',
        title: isYo ? 'Dín Àwọn Ìnáwó Kù' : 'Reduce Expenses',
        text: isYo ? 'Ìnáwó rẹ pọ̀ ju owó tó ń wọlé lọ. Ẹ ṣàyẹ̀wò gbogbo ìnáwó yín kí ẹ sì yọ àwọn tí kò pọndandan kúrò.' : 'Your expenses exceed income. Review each expense category and eliminate non-essential costs.'
      });
    }
    if (data.income === 0) {
      recs.push({
        icon: '🛒',
        title: isYo ? 'Kọ Àwọn Títà Sílẹ̀' : 'Record Your Sales',
        text: isYo ? 'Bẹ̀rẹ̀ sí kọ gbogbo àwọn títà àti iṣòwò rẹ sílẹ̀ láti mọ bí òwò rẹ ṣe ń lọ.' : 'Start recording all your sales and transactions to get accurate insights.'
      });
    }
    const outItems = inv.filter(p => p.qty === 0);
    if (outItems.length > 0) {
      recs.push({
        icon: '📦',
        title: isYo ? 'Ra Àwọn Ọjà Tó Ti Tán' : 'Restock Out-of-Stock Items',
        text: isYo ? `Ẹ ní ọjà ${outItems.length} tí wọ́n ti tán pátápátá. Ẹ tètè ra òmíràn kí ẹ má ba a sọ oníbàárà nù.` : `You have ${outItems.length} product(s) out of stock. Restock immediately to prevent lost sales.`
      });
    }
    if (data.receivable > data.income * 0.3) {
      recs.push({
        icon: '💳',
        title: isYo ? 'Gba Àwọn Gbèsè Tó Wà Níta' : 'Collect Outstanding Debts',
        text: isYo ? `Ẹ ní ${I18N.formatCurrency(data.receivable)} nínú gbèsè tí a kò tí ì gbà. Rán ìránlétí sí àwọn oníbàárà ní ọ̀sẹ̀ yìí.` : `You have ${I18N.formatCurrency(data.receivable)} in uncollected debts. Follow up with customers this week.`
      });
    }
    recs.push({
      icon: '📈',
      title: isYo ? 'Ṣe Ètò Ìdàgbàsókè Oṣù Tuntun' : 'Set Monthly Growth Target',
      text: isYo ? `Lórí owó ${I18N.formatCurrency(data.monthIncome)} tó wọlé nínú oṣù yìí, ẹ gbìyànjú láti mú un dàgbà sí i ní oṣù tó ń bọ̀.` : `Based on current monthly revenue of ${I18N.formatCurrency(data.monthIncome)}, target a 15-20% expansion next month.`
    });

    return recs;
  },

  render() {
    const score   = this.calculate();
    const verdict = this.getVerdict(score);
    const m       = this._lastMetrics || {};

    // 1. Dashboard Mini Gauge
    const dashGauge = document.getElementById('gaugeFill');
    const dashScore = document.getElementById('gaugeScore');
    const dashStat  = document.getElementById('dashHealthStatus');

    if (dashGauge) {
      const circ = 251;
      const fill = (score / 100) * circ;
      dashGauge.setAttribute('stroke-dasharray', `${fill} ${circ}`);
    }
    if (dashScore) dashScore.textContent = Math.round(score);
    if (dashStat)  {
      dashStat.textContent = verdict.label;
      dashStat.style.color = verdict.color;
    }

    // 2. Health Page Large Gauge
    const largeGauge = document.getElementById('gaugeFillLarge');
    const largeScore = document.getElementById('gaugeScoreLarge');
    const largeStat  = document.getElementById('gaugeStatusLarge');
    const verdictBox = document.getElementById('healthVerdict');

    if (largeGauge) {
      const circLarge = 377;
      const fillL = (score / 100) * circLarge;
      largeGauge.setAttribute('stroke-dasharray', `${fillL} ${circLarge}`);
    }
    if (largeScore) largeScore.textContent = Math.round(score);
    if (largeStat)  {
      largeStat.textContent = verdict.label;
      largeStat.style.fill  = verdict.color;
    }

    if (verdictBox) {
      verdictBox.innerHTML = `
        <h3 style="color:${verdict.color}">${verdict.label} (${Math.round(score)}/100)</h3>
        <p>${I18N.current === 'yo' ? 'Àyẹ̀wò pípé ti ìlera iṣòwò rẹ fún ọjọ́ òní.' : 'Comprehensive AI diagnostic of your business financial posture.'}</p>
      `;
    }

    // 3. Metric Progress Bars
    const setMetric = (name, val, pct) => {
      const scoreEl = document.getElementById(`metric${name}`);
      const fillEl  = document.getElementById(`metric${name}Fill`);
      if (scoreEl) scoreEl.textContent = val;
      if (fillEl)  fillEl.style.width   = `${Math.min(100, Math.max(0, pct))}%`;
    };

    setMetric('Revenue',   `${Math.round(m.revenue?.pct || 0)}%`,   m.revenue?.pct || 0);
    setMetric('Margin',    `${Math.round(m.margin?.pct || 0)}%`,    m.margin?.pct || 0);
    setMetric('Inventory', `${Math.round(m.inventory?.pct || 0)}%`, m.inventory?.pct || 0);
    setMetric('Debt',      `${Math.round(m.debt?.pct || 0)}%`,      m.debt?.pct || 0);
    setMetric('Activity',  `${Math.round(m.activity?.pct || 0)}%`,  m.activity?.pct || 0);
    setMetric('Cashflow',  `${Math.round(m.cashflow?.pct || 0)}%`,  m.cashflow?.pct || 0);

    // 4. Recommendations List
    const recsContainer = document.getElementById('healthRecommendations');
    if (recsContainer) {
      const recs = this.getRecommendations(score);
      recsContainer.innerHTML = recs.map(r => `
        <div style="display:flex; gap:14px; align-items:flex-start; margin-bottom:14px; padding-bottom:14px; border-bottom:1px solid rgba(255,255,255,0.06)">
          <div style="font-size:24px">${r.icon}</div>
          <div>
            <strong style="color:var(--text-primary); font-size:14px">${r.title}</strong>
            <p style="color:var(--text-secondary); font-size:13px; margin-top:2px">${r.text}</p>
          </div>
        </div>
      `).join('');
    }

    return score;
  }
};
