# 🚀 Publish Tauheed Kart to the live web

You chose:
- **Hosting:** Render (free Node.js server)
- **Order notifications:** Google Apps Script → emails `occcrick@gmail.com` AND stores every order in a Google Sheet (so it also shows in your seller dashboard on any device).

This guide has **two parts**. Do Part 1 (Google Apps Script) and Part 2 (Render). After both, your store is live at a public URL and every order sends you an email + appears in your dashboard.

---

## Part 1 — Set up the Google Apps Script backend (email + storage)

This is the "server brain." It receives orders, emails you, and saves everything to a Google Sheet.

1. Go to **https://sheets.new** — this opens a brand‑new blank Google Sheet. Name it something like **TauheedKart** (top‑left).
2. In the top menu click **Extensions → Apps Script**. Delete the default `Code.gs` content and **paste in the entire contents of the `apps-script.gs` file** that's in this folder.
3. In the Apps Script editor, at the top dropdown select the function **`setup`** and click **▶ Run**. A window will ask for permission — click **Review permissions**, choose your (the same) Google account, and click **Allow**. This creates the "Orders" and "Products" tabs in your Sheet automatically.
4. Click **Deploy → New deployment**. In the top‑right choose:
   - **Type:** Web app
   - **Description:** anything (e.g. "Tauheed Kart")
   - **Execute as:** **Me** ✅
   - **Who has access:** **Anyone** ✅ (so the public store can send orders)
   - Click **Deploy**.
5. Copy the **Web app URL** — it looks like:
   `https://script.google.com/macros/s/XXXXXX/exec`
6. **Save** that URL. You'll paste it into Render in Part 2.

> 💡 If you ever change the script, use **Deploy → Manage deployments → Edit → New version** — don't create a whole new deployment (it changes the URL).

---

## Part 2 — Deploy to Render (public URL)

1. Create a **free account** at **https://render.com** (sign in with GitHub).
2. Put this project folder (all files: `server.js`, `package.json`, `index.html`, `images/`, `apps-script.gs`, `README.md`) into a **GitHub repository** (a private repo is fine). If you need help, use GitHub Desktop or `git push`.
3. On Render, go to **Dashboard → New → Web Service**.
4. **Connect** your GitHub repo (grant access if asked).
5. Fill in:
   - **Name:** `tauheed-kart`
   - **Region:** choose the closest (e.g. Singapore)
   - **Root Directory:** leave blank (it's at the repo root)
   - **Runtime / Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Plan:** **Free** ✅
6. **Important — add the secret:** click **Advanced** → **Add Environment Variable**:
   - **Key:** `GOOGLE_APPS_SCRIPT_URL`
   - **Value:** paste your **Web app URL** from Part 1 (the `/exec` one)
   - (Optional) Add **Key:** `ADMIN_SECRET`, **Value:** your chosen password (default `Tauheed@2004`) — keep this matching `config.json.adminSecret` and the `SECRET` in `apps-script.gs`.
   - **Key:** `ADMIN_PHONE`, **Value:** `918877357633` — the number every new order notification is sent to.

> 🔔 **Every new order auto-notifies you (two automatic layers):**
> 1. **Permanent record + email** — the server forwards the order to your Google Apps Script, which emails `occcrick@gmail.com` and writes it to the Google Sheet. Your seller dashboard syncs this list from the server (auto-refreshes every 20s), so it shows **every order on any device, permanently**.
> 2. **Automatic WhatsApp/SMS to +91 918877357633** — the server fires a notification on each order. To actually deliver it, add ONE of these environment variables:
>    - **Meta WhatsApp Cloud API:** `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID`
>    - **or** any SMS/WhatsApp gateway webhook: `NOTIFY_WEBHOOK_URL`
>    (If you don't add a key, the site still works — the order is recorded permanently and emailed; the success page also gives the customer a one-tap button to send the order to your WhatsApp.)
7. Click **Create Web Service**. Render will build and deploy (takes a couple of minutes).
8. When ready, use the **URL** it gives you (something like `https://tauheed-kart.onrender.com`). **That's your live store.**

> ⚠️ On the **free** plan, Render's server "sleeps" after ~15 minutes of inactivity, so the first load after a gap may take ~30–60 seconds to wake up. Your data is safe — it lives in the Google Sheet.

---

## How to receive orders

Once both parts are live:
- **Every checkout** POSTs the order to your server → which forwards it to your Google Apps Script → which:
  1. **Emails you** at `occcrick@gmail.com` with the customer details, items, amount, and payment method.
  2. **Appends the order** to the "Orders" tab in your Google Sheet.
- **Your seller dashboard** (`⚙️` gear icon → admin password) fetches the order list from the server, so you see all real orders on **any device** — not just the one that placed them.

### Your live URLs
- **Store (customers):** `https://your-app.onrender.com`
- **Admin dashboard (you):** same URL → gear icon → your admin password

---

## Local preview (no server needed)

To preview/edit locally without deploying, run:
```bash
cd tauheed-kart
node server.js        # or: python3 -m http.server 8000
```
Open `http://localhost:3000`. Without Apps Script configured it runs in **demo/local mode** (data stays in your browser's localStorage) — perfect for testing the look and flows.

---

## Important notes & limits

- **UPI payment is manual** (the standard for a small dropshipping store): the customer pays `8877357633@ybl` via any UPI app, then confirms. Real payment-gateway integration (Razorpay/Instamojo) is a separate step if you want automated payment verification.
- **Order emails** use your Gmail (the account that ran the Apps Script). You can change `ADMIN_EMAIL` at the top of `apps-script.gs` to forward elsewhere.
- **Images you upload** in the admin panel are stored as base64 in the browser/Sheet. For a live catalog shared across all customers, prefer **hosted image URLs** (e.g. paste an `https://...` link) so everyone sees them.
- **Free-tier render** sleeps when idle; a paid instance removes that.
