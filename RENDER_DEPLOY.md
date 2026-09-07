# Tauheed Kart — Render Deploy (Exact Step-by-Step)

Aapka code GitHub par ready hai. Ab **Render** par deploy karke **permanent 24x7 URL** pao.
Ye steps ekdum simple hain — bas screenshot jaise follow karo.

---

## 🎯 Goal
Render par deploy → permanent URL milega (e.g. `https://tauheed-kart.onrender.com`).
Wahan **live-sync (SSE)** bhi 100% reliably chalega aur data bhi save rahega.

---

## ✅ Step 0 — Check karo (already done)
Repo GitHub par: **https://github.com/Mdtauheed2004/Tauheed-kart**
Files confirmed: `index.html`, `server.js`, `render.yaml`, `package.json`, `images/` sab maujood.

---

## ✅ Step 1 — Render account banao (free, 2 min)
1. Browser mein kholo: **https://render.com**
2. **Sign up / Sign in** → **Continue with GitHub** choose karo.
   - (Render ko GitHub se connect karne do — isse wo aapka repo dekh payega.)
   - Agar GitHub ka access na de, to **Email + password** se bhi account ban sakta hai.

---

## ✅ Step 2 — Blueprint se deploy karo (2 min)
1. Render dashboard par **New +** button (left-top) par click karo.
2. **Blueprint** choose karo. (Blueprint = `render.yaml` file se auto-build/deploy)
3. Render aapke GitHub repos ki list dikhayega → **`Tauheed-kart`** repo **select** karo.
4. Render `render.yaml` ko **detect** karega aur khud **Build + Deploy** shuru kar dega.
   - Build command: `npm install`
   - Start command: `node server.js`
5. ~2–3 minute wait karo. Render **deploy complete** dikhadega.

---

## ✅ Step 3 — Permanent URL pao
Deploy complete hone ke baad Render aapko ek URL dega, jaisa:
> **https://tauheed-kart.onrender.com**  (ya kuch aisa, Render khud random naam dega)
> Isko aap **Rename** kar sakte ho apne chatne wale naam par.

**Yahi URL ab permanent hai.** Kisi bhi phone/laptop par kholo — store dikhega. Data
(products + orders) Render ke persistent disk mein save hoga → **restart par bhi nahi jaayega**.

---

## ✅ Step 4 — Password set karo (important)
Maine `render.yaml` mein `ADMIN_SECRET = Tauheed@2004` already daal diya hai. Ye **server-side**
hai — browser mein kabhi nahi dikhta. Aap chaaho to badal sakte ho:
1. Render → apna service → **Environment** tab.
2. `ADMIN_SECRET` key ka **value** badlo (jaise `Tauheed@2004` → koi naya).
3. **Save** → Render **redeploy** karne do.

> Note: `config.json` (jisme password hai) **git mein nahi** gaya, isliye Render ke env var se
> password set hota hai — bilkul safe.

---

## ✅ Step 5 — Test karo (1 min)
Deploy ke baad:
- Kholo: `https://URL/healthz` → `{"ok":true,"backend":false}` dikhega (achha).
- Store kholo (URL) → **Admin Login** → password `Tauheed@2004` → dashboard khule.
- **Product add** karo → **phone/incognito mein URL kholo** → naya product **turant** dikhe. ✅
- **Order place** karo → admin dashboard + bell mein **turant** dikhe. ✅

---

## ✅ Optional — WhatsApp/Telegram notification (baad mein)
Phone par REAL message chahiye to Render → service → **Environment** tab mein ye add karo:
- **Telegram (free):** `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`
- **WhatsApp:** `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID`
- Yes save → redeploy → ab har order par message neeche aayega.

---

## ✅ Optional — Google Sheets backend (permanent data + order email)
Render free tier ka data thoda ephemeral ho sakta hai. **Really permanent** + **har order par email**:
1. [sheets.new](https://sheets.new) → naya sheet (naam: `TauheedKart`).
2. **Extensions → Apps Script** → default code hatao → `apps-script.gs` ka content paste karo.
3. `setup` run karo (permission approve). **Deploy → New deployment → Web app** (Anyone access).
4. Web app URL (ends `/exec`) ko Render ke env var **`GOOGLE_APPS_SCRIPT_URL`** mein daalo → redeploy.

Ab products/orders **Google Sheet** mein permanent, aur har order par **occcrick@gmail.com** par email.

---

## 🧯 Agar koi problem aaye
- **Build fail:** Render log mein dekhna — `npm install` error? bhai ko bhi batch configure kar sakte ho:
  Build command: `npm install`
  Aur package.json mein `engines.node` = `18.x` hai (Render support karta hai).
- **Health check:** `/healthz` → `{"ok":true}` hona chahiye.
- **Password galat:** Environment mein `ADMIN_SECRET` check karo.
- **Data reset hone par:** Apps Script backend lagao (Step 5 Optional) — data Sheet mein permanent.

---

## 🏁 Done!
Deploy hone par **`https://tauheed-kart.onrender.com`** (ya apna naam) — **24x7 live**, **live-sync SSE**,
**data persistent**, **admin panel**, sab kuch kaam karta hai. Ab temporary trycloudflare URL ki tension khatam.
