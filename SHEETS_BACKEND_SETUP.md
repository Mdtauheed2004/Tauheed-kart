# Tauheed Kart — Google Sheets Backend (Permanent Data)

> ✅ **STATUS UPDATE:** Aapka Apps Script URL **tested & working** hai aur `Products` sheet
> **already 8 products se seeded** hai. Apps Script ke read / write / delete — teeno verified.
> Ab bas **Step 2 (Render env var)** connect karna baaki hai — neeche dekho.

> 🔗 **Aapka Apps Script URL:**
> `https://script.google.com/macros/s/AKfycbxfM3ivE3GacLpzCx7oY8vNJgB11RltR8_eB4Ww7giVywCZHPhggOtNpNQXsZv7GXnq/exec`

> ⚠️ **Note:** `setup()` ab nahi chalana — sheet already full hai. Khan hoga to seed nahi hoga.

> 🔧 **Server ab out-of-the-box connect hota hai:** `server.js` mein ab Apps Script URL ka
> **hardcoded fallback** hai (kyunki `config.json` git-ignored hai aur Render deploy nahi hota).
> Matlab **bina env var daale bhi** Render par `backend:true` ho jaayega — bas ek naya deploy karo.
> Env var `GOOGLE_APPS_SCRIPT_URL` (agr set karo) sabse upar priority rakhta hai.

> 🔄 **Render free tier instance sleep hota hai:** inactivity par instance spin-down ho jaata hai,
> jisse URL `404 no-server` deta hai aur pehli request tak aata nahi. Iska matlab:
> - Browser mein URL kholo → Render "spinning up" dikhayega (~50s) phir site khulegi.
> - **Tip:** "Upgrade now" (paid) karo to instance kabhi sleep nahi hoga — 24x7 live.

## Problem jo aapne dekhi (bilkul sahi)
> "Render par restart hota hai tab product remove ho jaata hai."

**Reason:** Render **free tier** mein filesystem **ephemeral** hota hai — jab server restart hota
hai, `store.json` (products+orders) **reset** ho jaata hai. Isliye products gayab ho jaate hain.

**Pakka solution → Google Apps Script (Sheets) backend.** Isme products aur orders **Google Sheet** (cloud
spreadsheet) mein save hote hain. Sheet restart se delete nahi hoti — hamesha ke liye rehti hai.
Aapka **server.php already ready** hai — bas ek baar Google Sheet deploy aur URL connect karna hai.

> ✅ Bonus: iske through **har order par `occcrick@gmail.com` ko email** bhi auto-aata hai.

---

## ✅ Step 1 — Google Sheet + Apps Script deploy (3 minute, ek baar)

1. **Google Sheet banao:** kholo [sheets.new](https://sheets.new) → naya khali sheet (naam de do, jaise `TauheedKart`).

2. **Apps Script kholo:** Sheet mein menu se **Extensions → Apps Script**.

3. **Code paste karo:** default code ko poora delete karo → `apps-script.gs` (aapke store folder mein hai) ka **poora content** paste karo → save (💾).

4. **Run `setup()` ek baar:** toolbar mein **setup** select karo → **▶ Run**.
   - Google permission maangega → **Allow** karo (Review permissions → select account → Advanced → Go to setup() (unsafe) → Allow).
   - Isse `Products` aur `Orders` sheets banenge **aur 8 default products seed** ho jayenge (store kabhi blank nahi hoga).

5. **Deploy (Web app):** **Deploy → New deployment**.
   - **⚙ Select type:** **Web app**
   - **Description:** `Tauheed Kart backend`
   - **Execute as:** **Me**
   - **Who has access:** **Anyone**
   - **Deploy** karo.
   - **Web app URL** copy karo — ye **`/exec`** ke saath khatam hota hai (example: `https://script.google.com/macros/s/XXXX/exec`).

---

## ✅ Step 2 — URL ko server se connect karo

**Option A** — Render ke **Environment** mein env var daalo (yehi aapka asli step hai):
1. Render → apna service → **Environment** tab.
2. Naya env var: key = `GOOGLE_APPS_SCRIPT_URL`, value = ye URL:
   ```
   https://script.google.com/macros/s/AKfycbxfM3ivE3GacLpzCx7oY8vNJgB11RltR8_eB4Ww7giVywCZHPhggOtNpNQXsZv7GXnq/exec
   ```
3. **Save** → Render **redeploy** karne do (~1 min).

**Confirm:** Render ke URL ke aage `/healthz` kholo → `{"ok":true,"backend":true}` aana chahiye.
- `backend:true` = ✅ sheet connected, data ab **permanent** hai
- `backend:false` = ❌ env var nahi laga (space/typo/quote check karo)

**Option B** — Agar local/server mein: `config.json` mein `appsScriptUrl` bharo:
```json
{
  "appsScriptUrl": "https://script.google.com/macros/s/XXXX/exec",
  "adminSecret": "Tauheed@2004"
}
```
Phir server restart karo.

> ⚠️ Secret baat: `apps-script.gs` mein `SECRET = 'Tauheed@2004'` already hai jo aapke server ke
> `ADMIN_SECRET` se match karta hai — isliye orders sirf admin hi padh paata hai. Ye dono same rakhna.

---

## ✅ Step 3 — Test karo

1. Store kholo → **8 products** dikhne chahiye (Sheets se seed hue).
2. **Admin login** (`Tauheed@2004`) → koi **product add/edit/delete** karo → Sheet mein jaake **Products** tab dekho → wahan save hoga.
3. **Order place** karo → **Orders** tab mein dikhega + aapke email par order notification aayega.
4. **Server/restart** karo (Render redeploy) → products/orders **bhi waise hi rehte hain** (Sheets se).

---

## ✅ Verify: data Sheet mein permanent hai

Google Sheet kholo → `TauheedKart` → **Products** aur **Orders** tabs. Ye Google ke cloud mein save
hain — koi bhi server restart, Render redeploy, ya deploy delete hone par bhi **delete nahi honge**.

---

## 🧯 Agar kuch issue aaye
- **Store khali dikhe** → `setup()` ke baad `Products` sheet mein 8 rows honi chahiye. Nahi to Apps Script mein
  **`seedProducts`** run karo (toolbar → seedProducts → ▶ Run).
- **Admin orders nahi dikhte** → `SECRET` (apps-script.gs) aur `ADMIN_SECRET` (server) same honi chahiye.
- **Deploy/url galat** → web app URL `/exec` mein end hona chahiye; `GOOGLE_APPS_SCRIPT_URL` env var mein
  koi extra space/quote na ho.
- **"Go to setup() (unsafe)"** yaaro — Google naya Apps Script kaam karne ke liye ye normal confirmation hai;
  kyunki ye **aapke apne** Google account ka script hai, "Allow" karna safe hai.

---

## Kya kuch aur?
Main aapke store ka **sab kuch (8 products, backend sync, SSE live-push, order notification, free delivery)**
already ready kar diya hai. Bas upar ke **3 steps** (Sheet + Apps Script URL + connect) ko autocomplete karo —
aur aapka data **hamesha ke liye** safe ho jayega, chahe Render restart ho ya deploy delete ho jaaye.
