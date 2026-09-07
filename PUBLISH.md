# Tauheed Kart — GitHub + Render Deploy (Exact Steps)

Ab aapka store ek **GitHub repo** mein ready hai. Bas neeche ke steps follow karo aur aapko
**permanent 24x7 live URL** mil jayega. Aapke code mein sab kuch already configured hai.

---

## 🔴 Aapka abhi ka live (temporary) URL
> https://checks-vital-maybe-impressed.trycloudflare.com

Ye URL **is session ke saath band** ho jayega. Neeche wale steps se aapko **asli permanent URL** milega.

---

## STEP 1 — GitHub repo banao (2 minute)

1. [github.com](https://github.com) par **login** karo (free account).
2. Upar **`+`** button → **New repository** → repo ka naam `tauheed-kart` → **Private** ya **Public** (dono chalega) → **Create repository**.
3. Screen par jo repo URL dikhega usko copy karo (e.g. `https://github.com/USERNAME/tauheed-kart.git`).

---

## STEP 2 — Code ko GitHub par push karo

Apne computer par terminal/Command Prompt kholo aur ye commands run karo
(sirf `USERNAME` ki jagah apna GitHub username daalo):

```bash
cd path/to/tauheed-kart          # jisme index.html, server.js, render.yaml hain

git remote add origin https://github.com/USERNAME/tauheed-kart.git
git branch -M main
git push -u origin main
```

> 📝 **Password/token:** GitHub ab normal password se push nahi hota. Push karte samay
> password ki jagah aapka **Personal Access Token** use hoga:
> GitHub → Settings → Developer settings → Personal access tokens → **Generate new token**
> (repo scope `repo`. "Select scopes" mein `repo` tick karo). Wo token copy karo aur push mein use karo.

> ✅ Ye code folder maine pehle se **git commit** kar diya hai aur **config.json (password) +
> store.json (data)** git mein nahi gae hain. Isliye koi secret leak nahi hoga.

Push hone ke baad browser mein apni GitHub repo kholo — `index.html`, `server.js`, `render.yaml`
wahan dikhne chahiye.

---

## STEP 3 — Render par deploy (2 minute)

1. [render.com](https://render.com) par **free account** banao (GitHub login se).
2. Dashboard par **New +** → **Blueprint** → apna `tauheed-kart` repo **select** karo.
3. Render `render.yaml` ko detect karega aur khud build + deploy karega.
4. ~2–3 minute mein aapko mil jayega **permanent URL**, e.g.:
   > `https://tauheed-kart.onrender.com`
5. Wahi URL kisi bhi phone/laptop par kholo — store dikhega. Beta milestone: **24x7 online**, koi phir bhi block na kare.

---

## STEP 4 (Optional but RECOMMENDED) — Permanent data (Sheets backend)

Render free tier ka data **restart par reset** ho sakta hai (filesystem ephemeral). **Really durable**
data ke liye Google Apps Script backend (Google Sheet) connect karo — ye 3 minute ka setup hai aur
products/orders hamesha ke liye save rahenge:

*(Pure steps `apps-script.gs` file ke top comment mein already likhe hain. Short version:)*

1. [sheets.new](https://sheets.new) → naya sheet banao (naam: `TauheedKart`).
2. **Extensions → Apps Script** → default code hatao → `apps-script.gs` ka poora content paste karo.
3. Toolbar mein `setup` function select karke **Run** karo (permission Approve karo).
4. **Deploy → New deployment → Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
   - **Deploy** → Web app URL copy karo (ends with `/exec`).
5. Wo URL Render ke env var **`GOOGLE_APPS_SCRIPT_URL`** mein daalo (Render → Service → Environment)
   → save → Render **redeploy** karne do.

Ab orders + products **Google Sheet** mein permanent save honge, aur har naye order par
aapko **occcrick@gmail.com** par email bhi aayega.

---

## 🛡️ Security (already set)
- Admin password `Tauheed@2004` **server-side** hai; koi browser/git mein nahi.
- Render env var `ADMIN_SECRET` se set hota hai. `config.json` + `store.json` git mein nahi hain.

## ✅ Verify (bas check karo)
Deploy ke baad: `https://YOUR-URL/healthz` → `{"ok":true,"backend":true/false}`
Admin login → product add karo → phone/incognito mein `https://YOUR-URL/` kholo → naya product dikhna chahiye.

---

## Files jo deploy hui (git commit)
`index.html`, `server.js`, `render.yaml`, `package.json`, `apps-script.gs`, `images/`, `.gitignore`

> Agar koi step par atak jao, mujhe batao — main help kar dunga.
