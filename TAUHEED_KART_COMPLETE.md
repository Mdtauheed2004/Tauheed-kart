# 🛍️ Tauheed Kart — Complete Project File (Spec + Coding Notes)

> **One-stop reference.** This file captures the *entire* website in one place:
> the original brief (the "prompt"), the full architecture, every feature,
> the data model, the API, and how to deploy it. Use it as the project's
> single source of truth.

---

## 1. What is Tauheed Kart?

A **professional dropshipping e-commerce storefront** that lets a single owner
(seller) run a small online shop:

- A **customer** browses the catalog, adds to cart, and orders with **UPI** or **COD**.
- The **owner** manages products and sees **live order notifications** in a seller dashboard.
- Every order triggers an **email** to the owner's inbox and is saved permanently.

**Brand identity**
| Item | Value |
|---|---|
| Store name | **Tauheed Kart** |
| Logo | Text wordmark ("Tauheed **Kart**" with gradient on *Kart*). Image logo was removed because it did not render on the published host. |
| Helpline / support email | **occcrick@gmail.com** |
| UPI ID ( payments ) | **8877357633@ybl** |
| Payment methods | **UPI** and **Cash on Delivery (COD)** |

---

## 2. The brief (the original requirements / "prompt")

This is the requirement list that the site was built against. All items are
implemented in the current code.

### Core (must-have)
- [x] Owner can **list / add / edit / delete products** (admin panel).
- [x] **Buy Now** button on every product → goes **straight to the address/checkout form** (skips the product detail view).
- [x] **Cart** with add/edit quantity, remove, clear, and a **free-shipping progress bar** + **savings display**.
- [x] **Address-filling form** (name, phone, **email is optional**, address, city, state, pincode).
- [x] **Payment methods: UPI** (`8877357633@ybl`) **and COD**.
- [x] **Order success page** with receipt + tracking ID.
- [x] **Professional look** (modern, responsive, brand colors, cards, modals).

### Advanced (added in this build)
- [x] **Seller dashboard** with **live order notifications** (bell + unread badge).
- [x] **Product detail modal** (gallery with **multi-photo uploads**, ratings, stock, related items).
- [x] **10% automatic discount on UPI** payments (only discount offered now).
- [x] **Real image catalog** (`images/p1..p8.png`).
- [x] **Register / Login / Guest** customer account system.
- [x] **Product search** with a visible **Search button** (also shown on mobile now).
- [x] Free delivery above **₹499**; shipping **₹49** otherwise.

### Removed / decided in this session
- ❌ **WELCOME10 coupon** — removed entirely (cart coupon box, checkout checkbox, promo
  logic, `PROMO_CODE`, `promoApplied`, all promo rows). It was **replaced** by the
  **automatic 10% UPI discount** as the only discount.
- ❌ **Image logo** — removed (did not show after publishing); the site now uses the
  **"Tauheed Kart" text wordmark**.

---

## 3. Tech stack

| Layer | Technology |
|---|---|
| Frontend | **Single-file** `index.html` (HTML + CSS + vanilla JS, no framework) |
| Backend server | **Node.js + Express** (`server.js`) |
| Persistence / email | **Google Apps Script** → **Google Sheets** + **Gmail** |
| Storage (browser) | **localStorage** (demo/local mode) |
| Deployment | **Render** (free Node web service) |

Three-tier flow:
```
Customer Browser (index.html)
      │  fetch()
      ▼
Node/Express server (server.js)  ◄── hosts the store + API
      │  fetch()
      ▼
Google Apps Script (apps-script.gs)  ──►  Google Sheet (data) + Gmail (order emails)
```

When Apps Script isn't configured, the server runs in **demo/local mode**: the
catalog and orders live in **localStorage in the browser** (and the server keeps
an in-memory fallback). This keeps the site fully usable for previewing.

---

## 4. File-by-file structure

```
tauheed-kart/
├── index.html          ← THE app: HTML + CSS + all JavaScript (storefront + admin + cart + auth + search)
├── server.js           ← Express backend: hosts the store, exposes the JSON API, proxies to Apps Script
├── package.json        ← Node 18, dependency: express. `npm start` → `node server.js`
├── apps-script.gs      ← Google Apps Script "server brain": stores products/orders in Sheets + emails orders
├── config.json         ← User config: appsScriptUrl + adminSecret (git-ignored)
├── .gitignore          ← ignores node_modules/, config.json, .env, logs
├── PUBLISH.md          ← step-by-step Render + Google Apps Script publish guide
├── TAUHEED_KART_COMPLETE.md  ← this file (full notes)
└── images/             ← all assets (product PNGs + favicon)
```

### `index.html` (the whole app)
One self-contained file. Structure:
1. `<head>` — favicon, meta, full CSS (design tokens, layout, components, modals, cart, auth, responsive).
2. `<header class="site">` — logo text, nav, **search bar + 🔍 Search button**, notification bell, admin gear, account button, cart icon.
3. `<main>` — views: `home`, `shop`, `checkout`, `success`, `orders`, `admin`.
4. Modals — product detail, admin login, **auth (login/register/guest)**, legal.
5. `<script>` — the entire app logic.

**Key JavaScript sections:**
- **Constants**: `UPI_ID`, `STORE_NAME`, `FREE_SHIP=499`, `SHIP_FEE=49`, `DEFAULT_PRODUCTS`, `ADMIN_HASH`.
- **Storage helpers** (`tk_*` keys) + `hash256()` (SHA-256 via `crypto.subtle`).
- **Backend bridge** (`API.get/post/del`) + `bootstrap()`.
- **Rendering**: `renderHome`, `renderShop`/`productCard`, `renderCart`, `renderCheckout`, `renderSuccess`, `renderOrders`, `renderAdmin`, `renderProducts`.
- **Auth module**: register / login / guest / logout / prefill checkout.
- **Cart logic**: `addToCart`, `buyNow`, `chQty`, `rmCart`, `clearCart`, `cartTotal`, `cartCount`.
- **Pricing**: `calcTotal()` → `{total, ship, upiDisc, grand}`, `off(p)` for % off.
- **Admin**: `doAdminLogin` (server-side check), product CRUD, order list.

**Key pricing logic (`calcTotal`):**
```js
function calcTotal(){
  const total = cartTotal();                          // sum of item subtotals
  const ship  = total >= FREE_SHIP ? 0 : SHIP_FEE;    // free above ₹499 else ₹49
  const upiDisc = payment === "upi" ? Math.round(total*0.10) : 0; // 10% off on UPI
  const grand = Math.max(0, total + ship - upiDisc);
  return { total, ship, upiDisc, grand };
}
```

**Buy Now (skips product page):**
```js
function buyNow(id){
  const p = productOf(id); if(!p) return;
  cart = cart.filter(x => x.id === id);   // reset cart to this item
  cart.push({ id, qty: 1 });
  saveCart(cart); updateCartCount();
  closeAll(); closeModal(); go("checkout");   // straight to checkout
}
```

### `server.js` (Express backend)
- Reads `config.json` + env vars: `GOOGLE_APPS_SCRIPT_URL`, `ADMIN_SECRET`.
- Serves the static site (`index.html`, `images/`).
- In-memory **fallback** store (`memProducts`, `memOrders`) when Apps Script is off.
- Proxies to Apps Script with `appsScriptCall()` (POST) and `appsScriptGet()` (GET).
- **Auto-notifies the owner on EVERY order** to `ADMIN_PHONE` (default `918877357633`) via Meta WhatsApp Cloud API (`WHATSAPP_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID`) or a gateway webhook (`NOTIFY_WEBHOOK_URL`).
- Issues a **session token** on admin login (`POST /api/admin/login` → `{ok, token}`) so the dashboard can securely auto-refresh orders without storing the password. `GET /api/orders` accepts `?secret=` (password) OR `?token=` (live session).

| Method & route | Purpose | Notes |
|---|---|---|
| `GET /healthz` | Render health check | `{ok, backend}` |
| `GET /api/config` | Backend status | `{backend:bool}` |
| `POST /api/admin/login` | Owner login | body `{password}`; **checks `ADMIN_SECRET` server-side** |
| `GET /api/products` | Catalog | Apps Script → else in-memory |
| `POST /api/products` | Save product | Appends/updates |
| `DELETE /api/products/:id` | Delete product | |
| `POST /api/orders` | Place order | → Apps Script (emails owner) else local |
| `GET /api/orders` | Owner's orders | requires `?secret=` matching `ADMIN_SECRET` |

### `apps-script.gs` (Google Apps Script backend)
- Stored in a Google Sheet with two tabs: **Orders** and **Products**.
- `doGet`/`doPost` handle the actions used by the Node server.
- Emails `ADMIN_EMAIL = occcrick@gmail.com` for **every** order.
- Sheet headers (Orders): `id, date, customer_name, customer_phone, customer_email,
  customer_address, customer_city, customer_state, customer_pincode, items, subtotal,
  shipping, upi_discount, total, payment, status`.

> **Admin secret must match** between `apps-script.gs` (`SECRET`), `server.js`
> (`ADMIN_SECRET`) and `config.json` (`adminSecret`). Current value is explained in §8.

---

## 5. Data model (localStorage keys)

| Key | Contents |
|---|---|
| `tk_products` | Product array (id, name, cat, price, mrp, emoji, stock, rating, reviews, featured, image, images[], desc) |
| `tk_cart` | `[{id, qty}]` |
| `tk_orders` | Order array (id, date, items, sub, ship, upiDisc, total, customer, payment, status, userId, userEmail, **synced**) |
| `tk_wish` | wishlisted product ids |
| `tk_notifs` | in-app notifications `[{id,type,title,msg,time,read}]` |
| `tk_users` | customer accounts `[{id,name,email,pass(SHA-256),created}]` |
| `tk_session` | `{mode:"guest"|"user", userId?, name?, email?}` |
| `tk_sync_rev` | last catalog revision this client seen |

**Order ID:** `"TK" + Date.now()` last 10 digits → e.g. `TK1712345678`.
**Order `synced` flag:** `true` = reached the server; `false` = queued (offline retry).

---

## 5b. Sync system (products + orders) — how the owner's data stays in sync

- **Catalog sync** (`syncCatalog`): `server.js` keeps a **`catalogRev`** that is bumped on every
  product add / edit / delete (`POST`/`DELETE /api/products`). The frontend fetches `/api/products`,
  compares `rev` **and** a content hash (`catHash`), and only re-renders when the catalog changed.
  It runs at startup (`bootstrap()` — now actually invoked), every **30s** (`setInterval`), on
  `online` reconnect, on admin login, and right after the admin adds/edits/deletes a product — so
  catalog edits push to **all customers** live without a manual refresh.
- **Order sync / offline queue** (`syncOrders`): on checkout the order is written to `tk_orders`
  with `synced:false`, then POSTed to `POST /api/orders`. If the request fails (e.g. offline), the
  order stays queued and is retried every 30s and on reconnect. The server **dedupes by order id**,
  so retries never create duplicate orders.
- **Admin pull** (`refreshAdminOrders`): fetches `GET /api/orders?token=...` on login and every **20s**
  (auto-poll), marks all fetched orders `synced:true`, and merges them with any still-queued local
  orders — so the owner's dashboard shows **every order permanently**, on any device.
- Dashboard shows a **"Live sync"** panel (Connected / Local) plus a **"Last sync"** time.

---

## 6. Features — how each works

- **Search**: header input + **🔍 Search button** (and Enter key). Filters by name,
  category and description live, jumps to the Shop page. Visible on mobile too
  (was previously hidden on small screens).
- **Cart drawer**: opens on the cart icon; shows **every** item with image, qty
  stepper, **🛒 Add to Cart** button and **Remove**; free-delivery progress bar;
  savings line; clear-cart; proceeds to checkout.
- **Product detail modal**: gallery (multi-photo), ratings, stock status, offer %,
  Add to Cart + **Buy Now**, product details, "You may also like".
- **Checkout**: order summary, address form, UPI/COD toggle, UPI QR + deep link,
  10% UPI off shown, validates fields (email optional).
- **Order success**: receipt with ID, items, totals, payment method, next steps.
- **Seller dashboard**: password-gated; notifications bell; product CRUD
  (multi-image upload); order list/detail; order status.
- **Customer accounts**: register / login / guest. Passwords SHA-256 hashed.
  Logged-in checkout pre-fills name + email; "My Orders" is scoped to the account.
  Guest mode stores orders in the browser.

---

## 7. Design / constants

- **Colors**: brand indigo (`--brand`), accent, success, muted; professional
  light theme with dark footer.
- **Design tokens** in CSS `:root`.
- Free delivery **≥ ₹499**, shipping **₹49**.
- Responsive breakpoints: 960px and 720px.

---

## 8. 🔐 Admin & credentials

- **Admin password:** `Tauheed@2004`
- **Never shown in UI or browser source.** The site carries only a **SHA-256 hash**
  (`ADMIN_HASH`) for offline fallback.
- **Server-side check** via `POST /api/admin/login` (fields: `{ "password": "..." }`).
- The same secret must be set in **three places** (keep them identical):
  1. `server.js` → `ADMIN_SECRET` (env var `ADMIN_SECRET` or `config.json.adminSecret`)
  2. `config.json` → `adminSecret`
  3. `apps-script.gs` → `SECRET`

> ⚠️ **Security note:** `Tauheed@2004` is a secret. Do **not** commit it to a
> **public** repo or paste it into customer-facing code. Use the `ADMIN_SECRET`
> environment variable on Render instead.

---

## 9. How to log in as the seller

1. Go to the store URL.
2. Click the **gear icon** (top-right) → **Seller / Admin Login**.
3. Enter the admin password (`Tauheed@2004`).
4. You land in the **Seller Dashboard** with tools to add/edit products and a live
   notifications bell showing new orders.

---

## 10. Deploying (summary)

Full steps are in **`PUBLISH.md`**. Short version:

### Part 1 — Google Apps Script (order email + storage)
1. Open `https://sheets.new`, name the sheet.
2. **Extensions → Apps Script**, paste `apps-script.gs`.
3. Run the **`setup`** function once (approve permissions) → creates Orders + Products tabs.
4. **Deploy → New deployment → Web app**, Execute as **Me**, access **Anyone**.
   Copy the `/exec` URL.

### Part 2 — Render (public URL)
1. Push the project (except `config.json`, `node_modules/`) to a GitHub repo.
2. Render → New → **Web Service** → connect repo.
   - Build: `npm install` · Start: `node server.js` · Plan: **Free**.
3. Add env var **`GOOGLE_APPS_SCRIPT_URL`** = your `/exec` URL
   (and optionally **`ADMIN_SECRET`** = your secret).
4. Create; Render gives you a public URL — **that's the live store**. Every order
   emails the owner and appears in the dashboard.

> Free Render instances "sleep" after ~15 min idle; the first visit after a gap
> may take ~30–60s to wake.

---

## 11. Notes & limits

- **UPI payment is manual**: customer pays `8877357633@ybl` in any UPI app then
  confirms. Payment-gateway auto-verification (Razorpay, etc.) is a separate add-on.
- **Admin notification (every order)** — two automatic layers:
  1. **Permanent record + email**: order → server → Apps Script → email `occcrick@gmail.com`
     + Google Sheet. Dashboard syncs from the server (auto-refreshes every 20s) so it shows
     **every order permanently on any device**.
  2. **Automatic WhatsApp/SMS to +91 918877357633**: fired by the server on each order.
     Add `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID` (Meta Cloud API) or `NOTIFY_WEBHOOK_URL`
     (any SMS/WhatsApp gateway) to actually deliver it. Without a key, the order is still
     recorded + emailed, and the success page offers a one-tap WhatsApp button.
- For a catalog **shared across all customers**, prefer **hosted image URLs**
  (`https://...`) over base64 uploads.
- Changing `ADMIN_EMAIL` in `apps-script.gs` redirects order emails.
- All current discount logic = **10% off on UPI only** (WELCOME10 removed).

---

## 12. Quick local run

```bash
cd tauheed-kart
npm install
node server.js          # → http://localhost:3000
```
Without Apps Script it runs in demo/local mode (data in browser localStorage).

---

*End of file — last updated 2026-09-05.*
