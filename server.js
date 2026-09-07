/**
 * Tauheed Kart — backend server
 * Hosts the store at a public URL on Render and proxies data to a
 * Google Apps Script (which stores products/orders in Google Sheets and
 * sends order emails). Falls back to in-memory data if Apps Script isn't
 * configured yet, so the site still works as a demo.
 */
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ---- Config: Apps Script URL + admin secret (from env or config.json) ----
const configPath = path.join(__dirname, 'config.json');
let config = {};
try { config = JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch (e) { config = {}; }
const APPS_SCRIPT_URL = (process.env.GOOGLE_APPS_SCRIPT_URL || config.appsScriptUrl || '').trim();
const ADMIN_SECRET = process.env.ADMIN_SECRET || config.adminSecret || 'Tauheed@2004';

// ---- Admin notification settings (auto-notify owner on EVERY order) ----
const ADMIN_PHONE = (process.env.ADMIN_PHONE || '918877357633').replace(/\D/g, '');
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || '';                 // Meta WhatsApp Cloud API token
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const NOTIFY_WEBHOOK_URL = process.env.NOTIFY_WEBHOOK_URL || '';         // any SMS/WhatsApp gateway webhook (optional)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || config.telegramBotToken || '';   // Telegram bot (free, sends to ANY phone)
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || config.telegramChatId || '';          // your Telegram chat/group id (e.g. 123456789)
const crypto = require('crypto');
// In-memory admin session tokens (so the dashboard can securely auto-refresh orders without storing the password)
const adminSessions = new Map();
const SESSION_TTL = 1000 * 60 * 60 * 12; // 12 hours

function buildAdminMsg(order){
  const c = order.customer || {};
  const addr = [c.address, c.city, c.state, c.pincode].filter(Boolean).join(', ');
  const items = (order.items || []).map(i => '  • ' + (i.name||'') + ' x ' + (i.qty||'') + ' = Rs.' + (i.price*i.qty)).join('\n');
  return '🛒 NEW ORDER on Tauheed Kart\n\n' +
    'Order ID: ' + order.id + '\n' +
    'Date: ' + (order.date || '') + '\n\n' +
    'Customer: ' + (c.name||'') + '\n' +
    'Phone: ' + (c.phone||'') + '\n' +
    'Email: ' + (c.email||'-') + '\n' +
    'Address: ' + addr + '\n\n' +
    'Items:\n' + (items || '  -') + '\n\n' +
    'Subtotal: Rs.' + (order.sub||0) + '\n' +
    'Delivery: ' + (order.ship ? 'Rs.'+order.ship : 'FREE') + (order.upiDisc ? '\nUPI 10% Off: - Rs.'+order.upiDisc : '') + '\n' +
    'Total: Rs.' + (order.total||0) + '\n' +
    'Payment: ' + (order.payment||'-') + '\n\n' +
    '✅ Confirm & process this order on the Tauheed Kart dashboard.';
}

// Attempt to push an automatic notification to the owner's WhatsApp/SMS on every order.
async function sendAdminNotify(order){
  const text = buildAdminMsg(order);
  try{
    if (NOTIFY_WEBHOOK_URL) {
      await fetch(NOTIFY_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: ADMIN_PHONE, message: text, order })
      });
      console.log(`[notify] webhook notification sent for order ${order.id}`);
      return;
    }
    if (WHATSAPP_TOKEN && WHATSAPP_PHONE_NUMBER_ID) {
      const r = await fetch(`https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + WHATSAPP_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to: ADMIN_PHONE, type: 'text', text: { body: text } })
      });
      const j = await r.json().catch(() => ({}));
      console.log(`[notify] WhatsApp send for ${order.id}: ${j.message_id ? 'OK' : (j.error ? j.error.message : 'sent')}`);
      return;
    }
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      const r = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' })
      });
      const j = await r.json().catch(() => ({}));
      console.log(`[notify] Telegram send for ${order.id}: ${j.ok ? 'OK' : (j.description || 'sent')}`);
      return;
    }
    console.log(`[notify] order ${order.id} received for ${ADMIN_PHONE}. Add WHATSAPP_TOKEN/WHATSAPP_PHONE_NUMBER_ID, NOTIFY_WEBHOOK_URL or TELEGRAM_BOT_TOKEN+TELEGRAM_CHAT_ID to auto-send a real message.`);
  }catch(e){
    console.log('[notify] error sending notification: ' + e.message);
  }
}

app.use(express.json({ limit: '3mb' }));
// Serve the store (index.html + images/) — must be after API routes conceptually,
// but static middleware only serves files, so ordering is fine.
app.use(express.static(path.join(__dirname)));

// ---- Default catalog (mirrors the frontend seed) ----
const DEFAULT_PRODUCTS = [
  { id: "p1", name: "Wireless Bluetooth Earbuds with Charging Case", cat: "Electronics", price: 1299, mrp: 2999, emoji: "🎧", stock: 12, rating: 4.8, reviews: 1270, featured: true, image: "images/p1-earbuds.png", images: ["images/p1-earbuds.png"], desc: "Crystal-clear sound, active noise cancellation, 30-hour battery with charging case. Sweat-resistant and perfect for calls, music and gaming." },
  { id: "p2", name: "Smart Fitness Watch — Heart Rate & Steps", cat: "Electronics", price: 1999, mrp: 4499, emoji: "⌚", stock: 9, rating: 4.7, reviews: 830, featured: true, image: "images/p2-smartwatch.png", images: ["images/p2-smartwatch.png"], desc: "AMOLED display, heart-rate, SpO2 and sleep tracking, 120+ sport modes, calls & messages on wrist, 7-day battery life." },
  { id: "p3", name: "Premium Running Sneakers — Lightweight", cat: "Fashion", price: 1499, mrp: 2999, emoji: "👟", stock: 15, rating: 4.6, reviews: 520, featured: true, image: "images/p3-sneakers.png", images: ["images/p3-sneakers.png"], desc: "Breathable mesh upper, cushioned sole, perfect for running, gym and daily wear." },
  { id: "p4", name: "Urban Laptop Backpack — 15.6 inch Waterproof", cat: "Accessories", price: 899, mrp: 1999, emoji: "🎒", stock: 20, rating: 4.7, reviews: 410, featured: true, image: "images/p4-backpack.png", images: ["images/p4-backpack.png"], desc: "Water-resistant, anti-theft pocket, USB charging port, padded sleeve up to 15.6 inch." },
  { id: "p5", name: "Insulated Steel Water Bottle 1L", cat: "Home & Kitchen", price: 599, mrp: 999, emoji: "🥤", stock: 30, rating: 4.5, reviews: 640, featured: false, image: "images/p5-bottle.png", images: ["images/p5-bottle.png"], desc: "Keeps drinks cold for 24 hrs / hot for 12 hrs. Leak-proof, BPA-free." },
  { id: "p6", name: "Smart LED Strip Light — Music Sync RGB", cat: "Home & Kitchen", price: 499, mrp: 899, emoji: "✨", stock: 25, rating: 4.6, reviews: 720, featured: false, image: "images/p6-led.png", images: ["images/p6-led.png"], desc: "16 million colors, app + remote control, music-sync mode." },
  { id: "p7", name: "Car Phone Holder — Magnetic Dashboard Mount", cat: "Accessories", price: 399, mrp: 799, emoji: "🚗", stock: 18, rating: 4.4, reviews: 290, featured: false, image: "images/p7-phoneholder.png", images: ["images/p7-phoneholder.png"], desc: "Strong magnetic hold, 360 degree rotation, fits all phones." },
  { id: "p8", name: "Unisex Classic Denim Jacket", cat: "Fashion", price: 1199, mrp: 2499, emoji: "🧥", stock: 8, rating: 4.5, reviews: 150, featured: false, image: "images/p8-denim.png", images: ["images/p8-denim.png"], desc: "High-quality soft denim, timeless fit, stylish wash." }
];

// ---- Store (used when Apps Script is not configured) ----
// Persisted to a JSON file so products/orders survive a server restart and are
// a single shared source of truth for EVERY device that hits this server.
const storeDir = process.env.DATA_DIR || __dirname;
const storePath = path.join(storeDir, 'store.json');
let memProducts = DEFAULT_PRODUCTS.map(p => ({ ...p }));
let memOrders = [];
// Catalog revision: bumped on every product add/edit/delete so clients can cheaply detect changes.
let catalogRev = 1;
function loadStore(){
  try {
    const d = JSON.parse(fs.readFileSync(storePath, 'utf8'));
    if (Array.isArray(d.products)) memProducts = d.products;
    if (Array.isArray(d.orders)) memOrders = d.orders;
    if (d.catalogRev) catalogRev = d.catalogRev;
  } catch (e) {}
}
function saveStore(){
  try {
    fs.mkdirSync(storeDir, { recursive: true });
    fs.writeFileSync(storePath, JSON.stringify({ products: memProducts, orders: memOrders, catalogRev }));
  } catch (e) {}
}
loadStore();

// ---- Helpers to talk to Google Apps Script ----
async function appsScriptCall(payload) {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch (e) { return { ok: false, error: text.slice(0, 120) }; }
}
async function appsScriptGet(query) {
  const res = await fetch(APPS_SCRIPT_URL + '?' + query);
  const text = await res.text();
  try { return JSON.parse(text); } catch (e) { return { ok: false, error: text.slice(0, 120) }; }
}

// ---- LIVE PUSH (Server-Sent Events) ----
// Every connected client opens /api/events. When the catalog or orders change,
// we broadcast a signal so ALL devices re-sync immediately (no 30s wait).
const sseClients = new Set();
function sseSend(type, data){
  const payload = 'event: ' + type + '\ndata: ' + JSON.stringify(data || {}) + '\n\n';
  for (const res of sseClients){ try { res.write(payload); } catch (e) { sseClients.delete(res); } }
}
function broadcastCatalog(){ sseSend('catalog', { rev: catalogRev }); }
function broadcastOrders(){ sseSend('orders', {}); }
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  res.write('retry: 3000\n\n');
  sseClients.add(res);
  // Initial hello so the client knows the stream is open.
  res.write('event: hi\ndata: {"ok":true}\n\n');
  const clean = () => { res.end(); sseClients.delete(res); };
  res.on('close', clean);
  res.on('error', clean);
});

// ---- API: config ----
app.get('/api/config', (req, res) => {
  res.json({ backend: !!APPS_SCRIPT_URL });
});

// ---- API: admin login (server-side password check — password is never exposed) ----
app.post('/api/admin/login', (req, res) => {
  const pw = (req.body && req.body.password) || '';
  if (pw === ADMIN_SECRET) {
    const token = crypto.randomBytes(24).toString('hex');
    adminSessions.set(token, Date.now());
    return res.json({ ok: true, token, backend: !!APPS_SCRIPT_URL });
  }
  return res.json({ ok: false, backend: !!APPS_SCRIPT_URL });
});

// ---- API: products ----
app.get('/api/products', async (req, res) => {
  let products = memProducts, source = 'local';
  if (APPS_SCRIPT_URL) {
    try {
      const r = await appsScriptGet('action=products');
      if (r && r.products) { products = r.products; source = 'gapps'; }
    } catch (e) {}
  }
  res.json({ products, source, rev: catalogRev });
});

app.post('/api/products', async (req, res) => {
  const p = req.body;
  if (!p || !p.id) return res.status(400).json({ ok: false, error: 'bad product' });
  if (APPS_SCRIPT_URL) {
    try {
      const r = await appsScriptCall({ action: 'product', product: p });
      if (r && r.ok) { catalogRev++; saveStore(); broadcastCatalog(); return res.json({ ok: true, rev: catalogRev }); }
    } catch (e) {}
  }
  const i = memProducts.findIndex(x => x.id === p.id);
  if (i > -1) memProducts[i] = p; else memProducts.unshift(p);
  catalogRev++;
  saveStore();
  broadcastCatalog();
  res.json({ ok: true, rev: catalogRev });
});

app.delete('/api/products/:id', async (req, res) => {
  const id = req.params.id;
  if (APPS_SCRIPT_URL) {
    try {
      const r = await appsScriptCall({ action: 'deleteProduct', productId: id });
      if (r && r.ok) { catalogRev++; saveStore(); broadcastCatalog(); return res.json({ ok: true, rev: catalogRev }); }
    } catch (e) {}
  }
  memProducts = memProducts.filter(x => x.id !== id);
  catalogRev++;
  saveStore();
  broadcastCatalog();
  res.json({ ok: true, rev: catalogRev });
});

// ---- API: orders ----
app.post('/api/orders', async (req, res) => {
  const order = req.body;
  if (!order || !order.id) return res.status(400).json({ ok: false, error: 'bad order' });
  // Always notify the owner (WhatsApp/SMS/webhook) + store + email.
  sendAdminNotify(order); // fire-and-forget
  if (APPS_SCRIPT_URL) {
    try {
      const r = await appsScriptCall({ action: 'order', order });
      // avoid duplicate local store when Apps Script is the source of truth
      if (r && r.ok) { broadcastOrders(); return res.json({ ok: true, id: order.id, emailed: true }); }
    } catch (e) {}
  }
  // Dedupe: allow offline clients to retry an order without creating duplicates.
  const dupIndex = memOrders.findIndex(o => o.id === order.id);
  if (dupIndex > -1) memOrders.splice(dupIndex, 1);
  memOrders.unshift(order);
  saveStore();
  broadcastOrders();
  res.json({ ok: true, id: order.id, emailed: false });
});

app.get('/api/orders', async (req, res) => {
  // Authorize by admin secret (password) OR a live session token (issued at login).
  const token = req.query.token;
  const secretOk = req.query.secret === ADMIN_SECRET;
  const tokenOk = token && adminSessions.has(token);
  if (!secretOk && !tokenOk) return res.status(401).json({ ok: false, error: 'unauthorized' });
  if (APPS_SCRIPT_URL) {
    try {
      const r = await appsScriptGet('action=orders&secret=' + encodeURIComponent(ADMIN_SECRET));
      if (r && r.orders) return res.json({ orders: r.orders, source: 'gapps' });
    } catch (e) {}
  }
  res.json({ orders: memOrders, source: 'local' });
});

// ---- Root health check (Render uses this) ----
app.get('/healthz', (req, res) => res.json({ ok: true, backend: !!APPS_SCRIPT_URL }));

// Serve index.html at root explicitly (static middleware already handles it, but be safe)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Tauheed Kart server running on port ${PORT}`);
  console.log(`Apps Script backend: ${APPS_SCRIPT_URL ? 'CONNECTED' : 'NOT CONFIGURED (running in demo/local mode)'}`);
});
