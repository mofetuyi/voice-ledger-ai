/* ===================================
   SW.JS - Service Worker for Voice Ledger AI
   TuyiTek Digital Solutions
=================================== */

const CACHE_NAME = 'voice-ledger-ai-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './logo.png',
  './css/style.css',
  './css/components.css',
  './css/animations.css',
  './js/data.js',
  './js/i18n.js',
  './js/charts.js',
  './js/ledger.js',
  './js/inventory.js',
  './js/debts.js',
  './js/invoice.js',
  './js/ai-assistant.js',
  './js/health.js',
  './js/alerts.js',
  './js/reports.js',
  './js/voice.js',
  './js/app.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Network first with cache fallback
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
