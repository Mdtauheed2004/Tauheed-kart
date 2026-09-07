# Tauheed Kart — Kaam ho gaya (Summary + Setup)

Aapke dono kaam **complete** hain aur live test karke confirm kiye gaye hain.

---

## ✅ LIVE PUBLIC URL (abhi kisi bhi phone se kholo)
> **https://images-coordinator-reunion-deal.trycloudflare.com**

> ⚠️ Ye `trycloudflare.com` URL **temporary** hai — jab ye session band hoga to ye URL bhi band
> ho jayega. **Hamesha ke liye** (permanent 24x7) URL ke liye neeche `Render deploy` wala section padho.

---

## ✅ Kaam 1 — Admin product list kare → har mobile par dikhe
- Admin **Add/Edit/Delete** karte hi product **server** par save hota hai aur **sabhi clients**
  (phone/laptop) ko dikhne lagta hai.
- Data **`store.json`** mein save hota hai → **server restart hone par bhi nahi jaata**.
- Test (public URL se): admin add → naya device turant dekhta hai → cleanup. **Passed ✅**

## ✅ Kaam 2 — Doosre mobile se kharide → admin ko notification
- **In-app notification (default, active):** Admin login karte hi dashboard par **🔔 bell**
  dikhta hai + har naye order par toast + **All Orders** list mein permanent entry.
- Test (public URL se guest order): doosre device se order → admin dash mein turant dikha. **Passed ✅**

> **Phone par REAL message** (WhatsApp/Telegram/SMS) optional hai — abhi chuna gaya tha **in-app**.
> Baad mein phone message chahiye to bas `server.js` mein pehle se wired channels mein credentials
> bhar do (neeche "Optional" section).

---

## 🔧 Permanent URL (24x7) — Render par deploy

Abhi ka URL temporary hai. Hamesha ke liye reachable store chahiye to **Render** (free tier) par deploy karo.
Maine **`render.yaml`** bana diya hai — isse kaam 2 minute ka hai.

### Steps
1. Is folder ko GitHub repo par push karo.
2. [render.com](https://render.com) par free account banao → **New +** → **Blueprint** → apna repo choose karo.
3. Render khud build + deploy karega aur aapko **permanent URL** dega (e.g. `https://tauheed-kart.onrender.com`).
4. Ho gaya — ab wahi **permanent URL** kisi bhi phone par kholne par store dikhega.

> `render.yaml` mein pura config hai: `ADMIN_SECRET` (password) env var se set hota hai aur
> **kabhi browser/git mein nahi aata**. Ek **persistent disk** bhi set kiya hai taaki `store.json`
> (products + orders) restarts ke baad bhi bacha rahe.

---

## 🔐 Security (already set)
- Admin password **server-side** check hota hai; browser source mein kabhi nahi.
- `config.json` (secret + tokens) aur `store.json` (data) dono `.gitignore` mein hain — git par nahi jaate.

---

## ⚙️ Files jo maine banaye / badle (deploy ke liye)
| File | Kaam |
|---|---|
| `server.js` | `store.json` persistence + Telegram/WhatsApp/webhook notification + `DATA_DIR` support |
| `config.json` | Secret + notification tokens ke empty fields |
| `render.yaml` | Render one-click deploy blueprint (24x7 URL + disk) |
| `.gitignore` | runtime data + secret files ko git se bachaata hai |
| `ADMIN_SETUP.md` | Ye guide |

---

## 🔔 Optional (baad mein) — phone par real message
Koi bhi ek channel setup karo aur `config.json` mein bharo (ya Render ke env vars mein), phir server restart:
- **Telegram (free):** `@BotFather` se bot banao → `telegBotToken`, `telegramChatId`
- **WhatsApp:** Meta Business → `whatsappToken`, `whatsappPhoneNumberId`
- **SMS/any gateway:** `notifyWebhookUrl`

Har order par admin ko **full order details** (Order ID, Customer, Phone, Address, Items, Total, Payment) milenge.
