/**
 * ANALYTICS.JS - Server-Side Financial Intelligence & Health Score Engine
 * Voice Ledger AI by TuyiTek Digital Solutions
 */

const db = require('./db');

function calculateAnalytics() {
  const txs = db.getCollection('transactions');
  const debts = db.getCollection('debts');
  const inv = db.getCollection('inventory');

  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.substring(0, 7);

  // Overall totals
  const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const profit = income - expense;

  // Today
  const todayTxs = txs.filter(t => t.date === today);
  const todayIncome = todayTxs.filter(t => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const todayExpense = todayTxs.filter(t => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);

  // This Month
  const monthTxs = txs.filter(t => t.date && t.date.startsWith(thisMonth));
  const monthIncome = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const monthExpense = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);

  // Debts
  const receivable = debts.filter(d => d.debtType === 'receivable' && d.status !== 'paid').reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const payable = debts.filter(d => d.debtType === 'payable' && d.status !== 'paid').reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const overdueDebts = debts.filter(d => d.status === 'overdue' && d.debtType === 'receivable').reduce((s, d) => s + (Number(d.amount) || 0), 0);

  // Inventory
  const stockValue = inv.reduce((s, i) => s + ((Number(i.costPrice) || 0) * (Number(i.qty) || 0)), 0);
  const retailValue = inv.reduce((s, i) => s + ((Number(i.sellingPrice) || 0) * (Number(i.qty) || 0)), 0);
  const lowStock = inv.filter(i => i.qty <= (i.lowAlert || 5) && i.qty > 0).length;
  const outOfStock = inv.filter(i => i.qty === 0).length;

  const profitMargin = income > 0 ? ((profit / income) * 100).toFixed(1) : 0;

  // ── HEALTH SCORE ALGORITHM (0 - 100) ──
  let healthScore = 50;

  // 1. Profitability (Max 35 points)
  if (income > 0) {
    const margin = (profit / income) * 100;
    if (margin >= 25) healthScore += 30;
    else if (margin >= 10) healthScore += 20;
    else if (margin > 0) healthScore += 10;
    else healthScore -= 20;
  }

  // 2. Debt Safety Ratio (Max 25 points)
  if (receivable > 0) {
    if (payable === 0) healthScore += 15;
    else if (receivable >= payable) healthScore += 10;
    else healthScore -= 10;

    if (overdueDebts > receivable * 0.5) healthScore -= 15;
  } else {
    healthScore += 5;
  }

  // 3. Inventory Health (Max 20 points)
  if (outOfStock > 3) healthScore -= 15;
  else if (outOfStock > 0) healthScore -= 5;
  else if (inv.length > 0) healthScore += 10;

  // 4. Activity & Recency (Max 20 points)
  if (todayTxs.length > 0) healthScore += 10;
  if (monthTxs.length >= 10) healthScore += 10;

  healthScore = Math.max(10, Math.min(100, Math.round(healthScore)));

  return {
    income,
    expense,
    profit,
    profitMargin: Number(profitMargin),
    todayIncome,
    todayExpense,
    todayNet: todayIncome - todayExpense,
    todayTxCount: todayTxs.length,
    monthIncome,
    monthExpense,
    monthProfit: monthIncome - monthExpense,
    receivable,
    payable,
    netDebt: receivable - payable,
    overdueDebts,
    stockValue,
    retailValue,
    lowStock,
    outOfStock,
    totalTransactions: txs.length,
    healthScore
  };
}

module.exports = { calculateAnalytics };
