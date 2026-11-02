/**
 * ROUTES.JS - RESTful API Router
 * Voice Ledger AI by TuyiTek Digital Solutions
 */

const db = require('./db');
const { calculateAnalytics } = require('./analytics');
const aiService = require('./ai-service');

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
  });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) { // 5MB limit
        reject(new Error('Request payload too large'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON format'));
      }
    });
    req.on('error', reject);
  });
}

async function handleApi(req, res, pathname) {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
    });
    return res.end();
  }

  // 1. Health check
  if (pathname === '/api/health' || pathname === '/healthz') {
    return sendJson(res, 200, {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      service: 'Voice Ledger AI Production Backend',
      provider: 'TuyiTek Digital Solutions',
      aiConfigured: aiService.hasConfiguredKey(),
      counts: {
        transactions: db.getCollection('transactions').length,
        inventory: db.getCollection('inventory').length,
        debts: db.getCollection('debts').length,
        invoices: db.getCollection('invoices').length
      }
    });
  }

  // 2. Business profile
  if (pathname === '/api/business') {
    if (req.method === 'GET') {
      return sendJson(res, 200, db.getBusiness());
    }
    if (req.method === 'POST' || req.method === 'PUT') {
      const body = await parseJsonBody(req);
      const updated = db.setBusiness(body);
      return sendJson(res, 200, { success: true, business: updated });
    }
  }

  // 3. Settings
  if (pathname === '/api/settings') {
    if (req.method === 'GET') {
      return sendJson(res, 200, db.getSettings());
    }
    if (req.method === 'POST' || req.method === 'PUT') {
      const body = await parseJsonBody(req);
      const updated = db.setSettings(body);
      return sendJson(res, 200, { success: true, settings: updated });
    }
  }

  // 4. Analytics & Health Score
  if (pathname === '/api/analytics' && req.method === 'GET') {
    const data = calculateAnalytics();
    return sendJson(res, 200, data);
  }

  // 5. Transactions
  if (pathname === '/api/transactions') {
    if (req.method === 'GET') {
      return sendJson(res, 200, db.getCollection('transactions'));
    }
    if (req.method === 'POST') {
      const body = await parseJsonBody(req);
      if (!body.amount || !body.type) {
        return sendJson(res, 400, { error: 'amount and type are required' });
      }
      const saved = db.insert('transactions', {
        type: body.type,
        amount: Number(body.amount),
        category: body.category || 'sales',
        description: body.description || '',
        customer: body.customer || '',
        payment: body.payment || 'cash',
        date: body.date || new Date().toISOString().split('T')[0]
      });
      return sendJson(res, 201, { success: true, transaction: saved });
    }
  }

  if (pathname.startsWith('/api/transactions/') && req.method === 'DELETE') {
    const id = pathname.replace('/api/transactions/', '');
    const deleted = db.delete('transactions', id);
    return sendJson(res, 200, { success: deleted });
  }

  // 6. Inventory
  if (pathname === '/api/inventory') {
    if (req.method === 'GET') {
      return sendJson(res, 200, db.getCollection('inventory'));
    }
    if (req.method === 'POST') {
      const body = await parseJsonBody(req);
      if (!body.name) return sendJson(res, 400, { error: 'Product name is required' });
      let saved;
      if (body.id) {
        saved = db.update('inventory', body.id, body);
      } else {
        saved = db.insert('inventory', body);
      }
      return sendJson(res, 200, { success: true, product: saved });
    }
  }

  if (pathname.startsWith('/api/inventory/') && req.method === 'DELETE') {
    const id = pathname.replace('/api/inventory/', '');
    const deleted = db.delete('inventory', id);
    return sendJson(res, 200, { success: deleted });
  }

  // 7. Debts
  if (pathname === '/api/debts') {
    if (req.method === 'GET') {
      return sendJson(res, 200, db.getCollection('debts'));
    }
    if (req.method === 'POST') {
      const body = await parseJsonBody(req);
      if (!body.person || !body.amount) {
        return sendJson(res, 400, { error: 'person and amount are required' });
      }
      let saved;
      if (body.id) {
        saved = db.update('debts', body.id, body);
      } else {
        saved = db.insert('debts', body);
      }
      return sendJson(res, 200, { success: true, debt: saved });
    }
  }

  if (pathname.startsWith('/api/debts/') && req.method === 'PATCH') {
    const id = pathname.replace('/api/debts/', '');
    const body = await parseJsonBody(req);
    const updated = db.update('debts', id, body);
    return sendJson(res, 200, { success: !!updated, debt: updated });
  }

  if (pathname.startsWith('/api/debts/') && req.method === 'DELETE') {
    const id = pathname.replace('/api/debts/', '');
    const deleted = db.delete('debts', id);
    return sendJson(res, 200, { success: deleted });
  }

  // 8. Invoices
  if (pathname === '/api/invoices') {
    if (req.method === 'GET') {
      return sendJson(res, 200, db.getCollection('invoices'));
    }
    if (req.method === 'POST') {
      const body = await parseJsonBody(req);
      const saved = db.insert('invoices', body);
      return sendJson(res, 201, { success: true, invoice: saved });
    }
  }

  if (pathname.startsWith('/api/invoices/') && req.method === 'DELETE') {
    const id = pathname.replace('/api/invoices/', '');
    const deleted = db.delete('invoices', id);
    return sendJson(res, 200, { success: deleted });
  }

  // 9. Bi-directional Sync
  if (pathname === '/api/sync' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const syncedState = db.sync(body);
    return sendJson(res, 200, {
      success: true,
      timestamp: new Date().toISOString(),
      data: syncedState
    });
  }

  // 10. AI Chat Gateway
  if (pathname === '/api/ai/chat' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const query = body.query?.trim();
    const lang = body.lang || 'en';
    const clientKey = body.apiKey || null;

    if (!query) {
      return sendJson(res, 400, { error: 'query is required' });
    }

    try {
      const response = await aiService.chat(query, lang, clientKey);
      return sendJson(res, 200, response);
    } catch (err) {
      console.error('AI chat error:', err.message);
      return sendJson(res, 500, { error: 'AI processing failed', message: err.message });
    }
  }

  if (pathname === '/api/ai/status' && req.method === 'GET') {
    return sendJson(res, 200, {
      configured: aiService.hasConfiguredKey(),
      models: aiService.models,
      defaultEngine: 'Google Gemini 3 Flash'
    });
  }

  // 11. Backup & Restore
  if (pathname === '/api/backup' && req.method === 'GET') {
    const backup = db.createBackup();
    return sendJson(res, 200, { success: true, ...backup, data: db.memoryState });
  }

  if (pathname === '/api/restore' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    db.restore(typeof body === 'string' ? body : JSON.stringify(body));
    return sendJson(res, 200, { success: true, message: 'Database restored successfully' });
  }

  // Route not found
  return sendJson(res, 404, { error: 'API route not found' });
}

module.exports = { handleApi };
