/**
 * Tauheed Kart — Google Apps Script backend
 * ---------------------------------------------------------------
 * This script is the "server brain" for your store. It:
 *   1. Stores products & orders in a Google Sheet (free, persistent).
 *   2. Emails you (occcrick@gmail.com) a notification for EVERY order.
 *   3. Serves the catalog and orders back to your Node server / dashboard.
 *
 * GETTING STARTED (once, ~3 minutes):
 *   1. Go to https://sheets.new  -> creates a new Google Sheet (name it e.g. TauheedKart).
 *   2. Extensions -> Apps Script. Delete the default code and paste this whole file.
 *   3. Run the function `setup()` once (select it in the toolbar > Run). Approve permissions.
 *   4. Deploy > New deployment > Web app. Settings:
 *        - Execute as:  Me
 *        - Who has access:  Anyone (or "Anyone with the link" / "Anyone")
 *      Copy the Web app URL (ends in /exec).
 *   5. Put that URL into your config.json (or env var GOOGLE_APPS_SCRIPT_URL on Render).
 *
 * SECRET: keep the SECRET value below identical to the ADMIN_SECRET used by your
 * Node server so only you can read the orders list.
 */

const ADMIN_EMAIL = 'occcrick@gmail.com';   // gets every order notification
const SECRET = 'Tauheed@2004';               // must match server ADMIN_SECRET
const ORDERS_HEADERS  = ['id','date','customer_name','customer_phone','customer_email','customer_address','customer_city','customer_state','customer_pincode','items','subtotal','shipping','upi_discount','total','payment','status'];
const PRODUCTS_HEADERS = ['id','name','cat','price','mrp','emoji','stock','rating','reviews','featured','image','images','desc'];

// If the Products sheet is empty, these are seeded so the store is never blank.
const DEFAULT_PRODUCTS = [
  {id:'p1',name:'Wireless Bluetooth Earbuds with Charging Case',cat:'Electronics',price:1299,mrp:2999,emoji:'🎧',stock:12,rating:4.6,reviews:412,featured:true,image:'images/p1-earbuds.png',images:['images/p1-earbuds.png'],desc:'Crystal-clear sound, deep bass, touch controls, BT 5.3 and a pocket charging case with 24h playback.'},
  {id:'p2',name:'Smart Fitness Watch — Heart Rate & Steps',cat:'Electronics',price:1999,mrp:4499,emoji:'⌚',stock:9,rating:4.7,reviews:830,featured:true,image:'images/p2-smartwatch.png',images:['images/p2-smartwatch.png'],desc:'AMOLED display, heart-rate, SpO2 and sleep tracking, 120+ sport modes, calls & messages on wrist, 7-day battery life.'},
  {id:'p3',name:'Premium Running Sneakers — Lightweight',cat:'Fashion',price:1499,mrp:2999,emoji:'👟',stock:15,rating:4.6,reviews:520,featured:true,image:'images/p3-sneakers.png',images:['images/p3-sneakers.png'],desc:'Breathable mesh upper, cushioned sole, perfect for running, gym and daily wear. Trendy design, ultra comfortable.'},
  {id:'p4',name:'Urban Laptop Backpack — 15.6 inch Waterproof',cat:'Accessories',price:899,mrp:1899,emoji:'🎒',stock:18,rating:4.5,reviews:310,featured:true,image:'images/p4-backpack.png',images:['images/p4-backpack.png'],desc:'Padded 15.6" laptop sleeve, anti-theft pocket, USB port, water-resistant fabric. Perfect for college, work & travel.'},
  {id:'p5',name:'Insulated Steel Water Bottle 1L',cat:'Home & Kitchen',price:599,mrp:1199,emoji:'🥤',stock:22,rating:4.5,reviews:268,featured:false,image:'images/p5-bottle.png',images:['images/p5-bottle.png'],desc:'Double-wall vacuum insulated, keeps drinks cold 24h / hot 12h. Leak-proof, BPA-free, ideal for gym & travel.'},
  {id:'p6',name:'Smart LED Strip Light — Music Sync RGB',cat:'Home & Kitchen',price:499,mrp:899,emoji:'✨',stock:25,rating:4.6,reviews:720,featured:false,image:'images/p6-led.png',images:['images/p6-led.png'],desc:'16 million colors, app + remote control, music-sync mode, easy peel-and-stick installation. Transform any room.'},
  {id:'p7',name:'Car Phone Holder — Magnetic Dashboard Mount',cat:'Accessories',price:399,mrp:899,emoji:'🚗',stock:40,rating:4.4,reviews:195,featured:false,image:'images/p7-phoneholder.png',images:['images/p7-phoneholder.png'],desc:'360° rotation, strong magnetic mount, one-hand use. Fits all phones, safe for dashboard & windscreen.'},
  {id:'p8',name:'Unisex Classic Denim Jacket',cat:'Fashion',price:1199,mrp:2499,emoji:'🧥',stock:8,rating:4.5,reviews:150,featured:false,image:'images/p8-denim.png',images:['images/p8-denim.png'],desc:'High-quality soft denim, timeless fit, stylish wash. Available in multiple sizes — a wardrobe essential.'}
];

/** Run once to create the Orders & Products sheets with headers + seed default products. */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet(ss, 'Orders', ORDERS_HEADERS);
  const ps = ensureSheet(ss, 'Products', PRODUCTS_HEADERS);
  if (ps.getLastRow() < 2) {
    DEFAULT_PRODUCTS.forEach(p => handleProduct(p));
  }
  Utilities.sleep(300);
  return 'Sheets ready. Now Deploy > New deployment > Web app.';
}

// Re-run if you ever need to restore the default product catalog.
function seedProducts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ps = ensureSheet(ss, 'Products', PRODUCTS_HEADERS);
  DEFAULT_PRODUCTS.forEach(p => handleProduct(p));
  return 'Seeded ' + DEFAULT_PRODUCTS.length + ' products.';
}

function ensureSheet(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.appendRow(headers);
  }
  return sh;
}

function doGet(e) {
  const action = e && e.parameter && e.parameter.action;
  try {
    if (action === 'products') return jsonOut({ ok: true, products: readProducts() });
    if (action === 'orders') {
      if ((e.parameter.secret || '') !== SECRET) return jsonOut({ ok: false, error: 'unauthorized' });
      return jsonOut({ ok: true, orders: readOrders() });
    }
    return jsonOut({ ok: false, error: 'unknown action' });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  let data = {};
  try { data = JSON.parse(e.postData.contents); } catch (err) {
    return jsonOut({ ok: false, error: 'bad json' });
  }
  try {
    if (data.action === 'order')  return handleOrder(data.order);
    if (data.action === 'product') return handleProduct(data.product);
    if (data.action === 'deleteProduct') return handleDelete(data.productId);
    return jsonOut({ ok: false, error: 'unknown action' });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function handleOrder(o) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ensureSheet(ss, 'Orders', ORDERS_HEADERS);
  const row = [
    o.id, o.date,
    o.customer ? o.customer.name : '',
    o.customer ? o.customer.phone : '',
    o.customer ? o.customer.email : '',
    o.customer ? o.customer.address : '',
    o.customer ? o.customer.city : '',
    o.customer ? o.customer.state : '',
    o.customer ? o.customer.pincode : '',
    JSON.stringify(o.items || []),
    o.sub || 0, o.ship || 0, o.upiDisc || 0, o.total || 0,
    o.payment || 'UPI', o.status || 'Processing'
  ];
  sh.appendRow(row);

  // Email the admin
  try {
    const items = (o.items || []).map(i => '  - ' + i.name + '  x  ' + i.qty + '  =  Rs.' + (i.price * i.qty)).join('\n');
    const subject = '🛒 New Order ' + o.id + ' — ' + (o.payment || 'Order');
    const body =
      'A new order was placed on Tauheed Kart.\n\n' +
      'ORDER ID: ' + o.id + '\n' +
      'DATE: ' + (o.date || '') + '\n\n' +
      'ITEMS:\n' + items + '\n\n' +
      'PAYMENT: ' + (o.payment || 'UPI') + '\n' +
      'SUBTOTAL: Rs.' + (o.sub || 0) + '\n' +
      'SHIPPING: ' + (o.ship ? 'Rs.' + o.ship : 'FREE') + '\n' +
      (o.upiDisc ? 'UPI 10% OFF: Rs.' + o.upiDisc + '\n' : '') +
      'TOTAL: Rs.' + (o.total || 0) + '\n\n' +
      'CUSTOMER:\n' +
      '  Name:    ' + (o.customer ? o.customer.name : '') + '\n' +
      '  Phone:   ' + (o.customer ? o.customer.phone : '') + '\n' +
      '  Email:   ' + (o.customer ? o.customer.email : '') + '\n' +
      '  Address: ' + (o.customer ? o.customer.address : '') + ', ' + (o.customer ? o.customer.city : '') + ', ' + (o.customer ? o.customer.state : '') + ' - ' + (o.customer ? o.customer.pincode : '') + '\n\n' +
      'Process this order from your seller dashboard.';
    MailApp.sendEmail({ to: ADMIN_EMAIL, subject: subject, body: body });
  } catch (mailErr) {
    // Email failed but order is still saved; do not break the customer flow.
  }
  return jsonOut({ ok: true, id: o.id });
}

function handleProduct(p) {
  if (!p || !p.id) return jsonOut({ ok: false, error: 'bad product' });
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ensureSheet(ss, 'Products', PRODUCTS_HEADERS);
  const row = [
    p.id, p.name, p.cat, p.price, p.mrp || p.price, p.emoji || '📦', p.stock || 0,
    p.rating || 4.5, p.reviews || 0, p.featured ? 'TRUE' : 'FALSE',
    p.image || '', JSON.stringify(p.images || []), p.desc || ''
  ];
  // update matching row by id, else append
  const ids = sh.getRange(2, 1, Math.max(1, sh.getLastRow() - 1), 1).getValues().map(r => String(r[0]));
  const idx = ids.indexOf(String(p.id));
  if (idx > -1) {
    sh.getRange(idx + 2, 1, 1, row.length).setValues([row]);
  } else {
    sh.appendRow(row);
  }
  return jsonOut({ ok: true, id: p.id });
}

function handleDelete(id) {
  if (!id) return jsonOut({ ok: false, error: 'no id' });
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ensureSheet(ss, 'Products', PRODUCTS_HEADERS);
  const ids = sh.getRange(2, 1, Math.max(1, sh.getLastRow() - 1), 1).getValues().map(r => String(r[0]));
  const idx = ids.indexOf(String(id));
  if (idx > -1) sh.deleteRow(idx + 2);
  return jsonOut({ ok: true });
}

function readProducts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ensureSheet(ss, 'Products', PRODUCTS_HEADERS);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const vals = sh.getRange(2, 1, last - 1, PRODUCTS_HEADERS.length).getValues();
  const out = [];
  for (const r of vals) {
    if (!r[0]) continue;
    out.push({
      id: String(r[0]),
      name: r[1], cat: r[2], price: r[3], mrp: r[4], emoji: r[5] || '📦', stock: r[6],
      rating: r[7], reviews: r[8], featured: String(r[9]).toUpperCase() === 'TRUE',
      image: r[10] || '',
      images: parseArr(r[11]), desc: r[12] || ''
    });
  }
  return out;
}

function readOrders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ensureSheet(ss, 'Orders', ORDERS_HEADERS);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const vals = sh.getRange(2, 1, last - 1, ORDERS_HEADERS.length).getValues();
  const out = [];
  for (const r of vals) {
    if (!r[0]) continue;
    out.push({
      id: String(r[0]), date: r[1],
      customer: { name: r[2], phone: r[3], email: r[4], address: r[5], city: r[6], state: r[7], pincode: r[8] },
      items: parseArr(r[9]), sub: r[10], ship: r[11], upiDisc: r[12], total: r[13],
      payment: r[14], status: r[15]
    });
  }
  return out;
}

function parseArr(s) {
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch (e) { return []; }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
