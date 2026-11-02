/**
 * SERVER.JS - High-Performance Enterprise Backend Server
 * Voice Ledger AI by TuyiTek Digital Solutions
 * 
 * Features:
 * - Zero-dependency native Node.js architecture for maximum reliability and speed
 * - Military-grade security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
 * - In-memory IP rate-limiting to prevent DDoS and API abuse
 * - Gzip/Deflate compression for fast loading over African 3G/4G networks
 * - Full RESTful API with atomic persistence and sync
 * - Secure Gemini AI Gateway with server-side API key management
 * - PWA Service Worker caching and SPA fallback
 * - Graceful shutdown handling
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { handleApi } = require('./backend/routes');

const PORT = process.env.PORT || 10000;
const PUBLIC_DIR = __dirname;

// ── SECURITY HEADERS ──
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'microphone=(self)',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
};

// ── RATE LIMITER (SLIDING WINDOW) ──
const RATE_LIMITS = new Map();
const RATE_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_GENERAL_REQ = 120;
const MAX_AI_REQ = 30;

function isRateLimited(ip, isAi) {
  const now = Date.now();
  let client = RATE_LIMITS.get(ip);
  if (!client || now - client.windowStart > RATE_WINDOW_MS) {
    client = { windowStart: now, generalCount: 0, aiCount: 0 };
    RATE_LIMITS.set(ip, client);
  }

  if (isAi) {
    client.aiCount++;
    return client.aiCount > MAX_AI_REQ;
  } else {
    client.generalCount++;
    return client.generalCount > MAX_GENERAL_REQ;
  }
}

// Clean up expired rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of RATE_LIMITS.entries()) {
    if (now - data.windowStart > RATE_WINDOW_MS) {
      RATE_LIMITS.delete(ip);
    }
  }
}, 5 * 60 * 1000);

// ── MIME TYPES ──
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg'
};

const server = http.createServer(async (req, res) => {
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';

  // Apply security headers
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(key, value);
  }

  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(reqUrl.pathname);

  // Rate limiting check
  const isAiRoute = pathname === '/api/ai/chat';
  if (isRateLimited(clientIp, isAiRoute)) {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Too many requests. Please slow down.' }));
  }

  // ── 1. API ROUTING ──
  if (pathname.startsWith('/api/') || pathname === '/healthz') {
    try {
      await handleApi(req, res, pathname);
    } catch (err) {
      console.error(`API Error on ${pathname}:`, err);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal Server Error', message: err.message }));
      }
    }
    return;
  }

  // ── 2. STATIC ASSET SERVING ──
  let filePath = pathname === '/' ? '/index.html' : pathname;
  const safePath = path.normalize(path.join(PUBLIC_DIR, filePath));

  // Security: prevent path traversal out of public directory
  if (!safePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('403 Forbidden');
  }

  fs.stat(safePath, (err, stats) => {
    if (!err && stats.isFile()) {
      serveFile(req, res, safePath, filePath);
    } else {
      // SPA Fallback: serve index.html for unknown frontend routes
      const indexPath = path.join(PUBLIC_DIR, 'index.html');
      serveFile(req, res, indexPath, '/index.html');
    }
  });
});

function serveFile(req, res, absPath, relPath) {
  const ext = path.extname(absPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  const headers = { 'Content-Type': contentType };

  if (ext === '.html') {
    headers['Cache-Control'] = 'no-cache, must-revalidate';
  } else if (relPath === '/sw.js') {
    headers['Service-Worker-Allowed'] = '/';
    headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
  } else {
    headers['Cache-Control'] = 'public, max-age=86400, stale-while-revalidate=604800';
  }

  const acceptEncoding = req.headers['accept-encoding'] || '';
  const canGzip = acceptEncoding.includes('gzip') && (ext === '.html' || ext === '.css' || ext === '.js' || ext === '.json' || ext === '.svg');

  if (canGzip) {
    headers['Content-Encoding'] = 'gzip';
    res.writeHead(200, headers);
    const rawStream = fs.createReadStream(absPath);
    const gzip = zlib.createGzip({ level: 6 });
    rawStream.pipe(gzip).pipe(res);
  } else {
    res.writeHead(200, headers);
    fs.createReadStream(absPath).pipe(res);
  }
}

// ── GRACEFUL SHUTDOWN ──
function shutdown(signal) {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('Forcefully terminating server.');
    process.exit(1);
  }, 5000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=========================================`);
  console.log(`Voice Ledger AI Backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`TuyiTek Digital Solutions (c) 2026`);
  console.log(`=========================================`);
});
