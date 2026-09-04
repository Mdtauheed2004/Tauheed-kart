# Tauheed-kart
This is an online shopping platform for drop shipping 
/**
 * Tauheed Kart â€” Google Apps Script backend
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
const SECRET = 'tauheed123';                 // must match server ADMIN_SECRET
const ORDERS_HEADERS  = ['id','date','customer_name','customer_phone','customer_email','customer_address','customer_city','customer_state','customer_pincode','items','subtotal','shipping','promo_discount','upi_discount','total','payment','status'];
const PRODUCTS_HEADERS = ['id','name','cat','price','mrp','emoji','stock','rating','reviews','featured','image','images','desc'];

/** Run once to create the Orders & Products sheets with headers. */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet(ss, 'Orders', ORDERS_HEADERS);
  ensureSheet(ss, 'Products', PRODUCTS_HEADERS);
  Utilities.sleep(300);
  return 'Sheets ready. Now Deploy > New deployment > Web app.';
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
    o.sub || 0, o.ship || 0, o.disc || 0, o.upiDisc || 0, o.total || 0,
    o.payment || 'UPI', o.status || 'Processing'
  ];
  sh.appendRow(row);

  // Email the admin
  try {
    const items = (o.items || []).map(i => '  - ' + i.name + '  x  ' + i.qty + '  =  Rs.' + (i.price * i.qty)).join('\n');
    const subject = 'ðŸ›’ New Order ' + o.id + ' â€” ' + (o.payment || 'Order');
    const body =
      'A new order was placed on Tauheed Kart.\n\n' +
      'ORDER ID: ' + o.id + '\n' +
      'DATE: ' + (o.date || '') + '\n\n' +
      'ITEMS:\n' + items + '\n\n' +
      'PAYMENT: ' + (o.payment || 'UPI') + '\n' +
      'SUBTOTAL: Rs.' + (o.sub || 0) + '\n' +
      'SHIPPING: ' + (o.ship ? 'Rs.' + o.ship : 'FREE') + '\n' +
      (o.disc ? 'PROMO DISCOUNT: Rs.' + o.disc + '\n' : '') +
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
    p.id, p.name, p.cat, p.price, p.mrp || p.price, p.emoji || 'ðŸ“¦', p.stock || 0,
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
      name: r[1], cat: r[2], price: r[3], mrp: r[4], emoji: r[5] || 'ðŸ“¦', stock: r[6],
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
      items: parseArr(r[9]), sub: r[10], ship: r[11], disc: r[12], upiDisc: r[13], total: r[14],
      payment: r[15], status: r[16]
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
