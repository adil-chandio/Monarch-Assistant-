# 👑 Monarch Assistant — WhatsApp Personal Assistant

Monarch sir ka personal WhatsApp assistant. Jab bhi koi contact message kare, assistant
izzat se reply karta hai — **usi zabaan me jis me samne wala baat kar raha ho**
(Urdu / English / Roman Urdu).

## 📜 Assistant ka role (code me exactly yahi hai)

1. Hamesha pehle:
   > **Assalam-o-Alaikum, Monarch sir abhi busy hain, aapko jald hi reply mil jayega.**
2. Phir:
   > **Batayen main aapki kya madad kar sakta hun? Aapka naam aur kaam bata den taake sir aate hi aapse contact kar len.**
3. Kabhi nahi batata ke wo AI hai — sirf assistant ki tarah baat karta hai.
4. Language detection automatic:
   - Urdu script me likha → **Urdu** reply
   - English me likha → **English** reply
   - Roman Urdu (default) → **Roman Urdu** reply (sir wali exact lines)

Reply ke text ko badalna ho to sirf [`lib/replies.js`](lib/replies.js) edit karo.

---

## ⚙️ Ye kaise chalta hai

```
Contact ──message──▶ WhatsApp ──▶ Meta (Cloud API)
                                      │  (webhook POST)
                                      ▼
                          Aapka chota server (is repo ka server.js)
                          ├── language detect karta hai
                          └── reply bhejta hai ──▶ contact ko WhatsApp pe
```

**Zaroori baat (seedha sach):** Meta ki official WhatsApp Cloud API me incoming messages
ke liye koi *polling* endpoint nahi hai — messages sirf **webhook** se milte hain.
Is liye 100% sirf GitHub (Actions cron) se reply possible NAHI hai. Isliye design ye hai:

| Kaam | Kaun karta hai | Cost |
|---|---|---|
| Code + versioning + tests (CI) | **GitHub** (is repo) | Free |
| Auto-deploy (push hote hi) | GitHub se connect kare hue host (Render) | Free |
| Webhook receive + reply | Chota Node.js server (`server.js`) | Free (Render free tier) |

Total kharcha: **0 rupees.**

---

## 🚀 Setup (step by step)

### Step 1 — Meta se Phone Number ID aur Token

1. [business.facebook.com](https://business.facebook.com) pe jao (WABA/WhatsApp Business API wala account).
2. **WhatsApp → API Setup** (ya "Meta" section) me apna business phone number hai — wahan **Phone number ID** milega. Note kar lo.
3. **Token** banane ke liye: **Settings → Users → System users** (ya "System users" tab) → ek system user banao (role: Admin) → uske liye **permanent access token** generate karo, in permissions ke sath:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
4. Token copy kar lo. *(Note: Graph API Explorer ka token sirf ~60 din ke liye milta hai — permanent token hi use karna.)*
5. Apna personal number **Test users** me add kar lo (test mode me sirf test users hi message kar sakte hain) — ya number ko production me le jao.

### Step 2 — Server deploy karo (do options)

#### Option A — Render (recommended, 5 minute)
1. [render.com](https://render.com) pe free account banao (credit card NAHI chahiye).
2. **New + → Blueprint** → apna GitHub repo (`Monarch-Assistant`) select karo → `render.yaml` khud detect ho jayega.
3. Wo values poochega jo daalo:
   - `WHATSAPP_TOKEN` = apna permanent token
   - `PHONE_NUMBER_ID` = Step 1 ka ID
   - `WHATSAPP_PHONE` = apna business number digits me (e.g. `923001234567`)
4. Deploy ho jaye → URL milega jaise `https://monarch-assistant.onrender.com`.
5. Aage ke har push/PR par Render **auto-deploy** karega (repo GitHub se connected hai).

#### Option B — Freebuff Cloud (free cloud sandbox, repo connect karke)
[freebuff.com/cloud](https://freebuff.com/cloud) par apna GitHub repo connect karo —
woh repo clone karke cloud sandbox boot karta hai aur live preview deta hai.

1. Freebuff par GitHub se sign in → apna repo (`Monarch-Assistant`) select karo
   (code **main** branch par honi chahiye — isliye pehle PR merge karo).
2. Sandbox ke settings me ye **environment variables** set karo:
   - `WHATSAPP_TOKEN`, `PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`,
     `WHATSAPP_PHONE`, `WEBHOOK_VERIFY_TOKEN`
3. Start command: `npm start` (package.json me already hai — zyada tar khud detect ho jayega;
   port 3000).
4. Preview URL milega — Meta dashboard me webhook URL: `https://<freebuff-preview-url>/webhook`
5. WhatsApp se test message bhejo.

> ⚠️ **Zaroori test karo:** Freebuff ek *dev sandbox* hai (Replit jaisa). Kuch sandboxes
> idle (~20-30 min) par **so** jate hain — agar sandbox so gaya to Meta ka webhook kisi ko
> nahi pohanchega aur reply nahi aayega. Test: sandbox ko 30 min idle chho do, phir WhatsApp
> message bhejo — reply 2-5 sec me aaya to Freebuff **24/7 ke liye bhi perfect** hai;
> late aaya ya nahi aaya to permanent host ke liye Option A (Render) use karo.

#### Option C — Koi aur VPS / shared host
Koi bhi host chalega jahan **Node.js 18+** 24/7 chalta ho ya **Docker** ho. Is repo me
`Dockerfile` already hai:
```bash
git clone <repo-url> && cd Monarch-Assistant
docker build -t monarch-assistant .
docker run -d -p 3000:3000 \
  -e WHATSAPP_TOKEN=... -e PHONE_NUMBER_ID=... -e WHATSAPP_PHONE=... \
  -e WEBHOOK_VERIFY_TOKEN=monarch-assistant-verify \
  --name monarch-assistant --restart always \
  monarch-assistant
```
Ya bare Node se:
```bash
export WHATSAPP_TOKEN=... PHONE_NUMBER_ID=... WHATSAPP_PHONE=...
node server.js
```
Host ka public HTTPS URL chahiye (Meta sirf HTTPS webhook maanta hai).

> ⚠️ **Sirf file storage (jaise cloud drive/object storage) kaam NAHI karega** —
> usme Node/Docker process 24/7 nahi chalta. Hosting me Node ya Docker hona zaroori hai.

### Step 3 — Token check karo (webhook se PEHLE) 🩺

Deploy ke baad, host ke terminal/sandbox me:
```bash
npm run check
```
Ye aapki 3 values (token, phone number ID, WABA ID) ko Graph API ke sath live
validate karta hai aur batata hai:
- ✅ token valid hai ya nahi (aur galat kyun hai — exact reason)
- 📱 number **testing** mode me hai (sirf test users) ya **production** (sab log)
- ⚠️ display name set hai ya nahi
- 🏢 WABA (business account) valid hai ya nahi

`✅ TOKEN VALID` aaye to hi aage badho — webhook lagane ke baad error aana mushkil hota hai.

### Step 4 — Meta dashboard me webhook lagao

1. Meta: **WhatsApp → (Settings/API) → Webhooks** (ya "Callback configuration").
2. **Callback URL** daalo: `https://<AAPKA-HOST>/webhook`
   - Render wala ho to: `https://monarch-assistant.onrender.com/webhook`
3. **Verify Token** daalo: `monarch-assistant-verify`
   (jaisa bhi daala ho `WEBHOOK_VERIFY_TOKEN` me — dono jagah wahi hona chahiye)
4. **Verify** dabao → server challenge return karega → ho jayega ✅
5. **Fields** me `messages` select karke **Subscribe** karo.

### Step 5 — Test karo 🧪

1. Apne personal number se business number ko WhatsApp message bhejo.
2. 2-5 second me reply aana chahiye:
   - Roman Urdu me likha → Roman Urdu reply
   - English me likha → English reply
   - Urdu script me likha → Urdu reply
3. Server ke logs me dekho: `replied to <number> in [roman] (msg wamid....)`

---

## 🔐 Token ki security (zaroori)

- Access token **sirf** host ke environment variables me jaata hai (Freebuff/Render/VPS).
- Token kabhi chat, screenshot, ya GitHub repo/commit me NAHI likhna — jo bhi
  token ke sath login kar sakta hai, aapke business number se message bhej sakta hai.
- Agar token kahin share ho gaya ho to Meta dashboard me system user ka token
  **regenerate** kar do (purana turant band ho jata hai).
- `.env` file git se gitignored hai — local check ke liye safe hai.

## 🧪 Local test (apne computer pe)

```bash
# local tunnel banao (webhook ke liye)
npx ngrok http 3000

# ek terminal me:
cp .env.example .env   # values bharo
node server.js

# doosre terminal me webhook simulate karo:
curl -X POST http://localhost:3000/webhook -H 'Content-Type: application/json' -d '{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "123",
    "changes": [{
      "field": "messages",
      "value": {
        "messaging_product": "whatsapp",
        "metadata": { "phone_number_id": "1234567890123" },
        "messages": [{
          "id": "wamid.TEST123",
          "from": "923009998887",
          "to": "923001234567",
          "timestamp": "1758000000",
          "type": "text",
          "text": { "body": "kya hal hai bhai" }
        }]
      }
    }]
  }]
}'
```

Unit tests (language detection + replies):
```bash
npm test
```

---

## 📁 Files

| File | Kaam |
|---|---|
| `server.js` | Webhook server (GET verify + POST reply) — zero dependencies |
| `lib/detect.js` | Language detection (Urdu / English / Roman Urdu) |
| `lib/replies.js` | **Sir wali 3 zabaanon me reply lines** (yahan se customize karo) |
| `lib/whatsapp.js` | WhatsApp Cloud API se message bhejna (Graph v25.0) |
| `bot.test.js` | Unit tests (`npm test`) |
| `scripts/check-connection.js` | Token/WABA validation (`npm run check`) |
| `Dockerfile` | Docker deploy ke liye (kisi bhi host/VPS pe) |
| `render.yaml` | Render one-click deploy (Blueprint) |
| `bot.test.js` + `npm test` | Unit tests (language detection + replies) |

---

## ⚠️ Limitations / Notes

- **Reply time:** Server khara ho to reply **2-5 second** me. Render free tier ~15 min
  idle ke baad so jata hai → pehla reply 30-60 sec me aata hai, baad me turant.
  (Meta agar webhook dobara bhejta hai to dedupe se bacha jata hai — double reply nahi hota.)
- **Sirf text messages** pe reply hota hai (image/voice/document pe abhi nahi — v2 me add ho sakta hai).
- **Groups ke messages ignore** hote hain (sirf individual chats).
- **Aapka apna number** (`WHATSAPP_PHONE`) ignore hota hai — aapko apne hi messages pe reply nahi aayega.
- **Meta free tier:** 250 free "service conversations" mahine me (contact pehle message kare → uska reply free). Personal assistant ke liye kaafi.
- **Duplicate protection:** Meta agar webhook dobara bheje to double reply NAHI hota.
- **Token security:** Token sirf environment variables me hai — repo me kaha nahi. `.env` gitignored hai. GitHub me secrets mat paste karna (yahan chahiye bhi nahi).

## ❓ Troubleshooting

| Masla | Hal |
|---|---|
| `Invalid OAuth access token` (code 190/131044) | Token galat/expire — Step 1 ka **permanent** token use karo |
| `phone number not registered` / not allowed (131027) | Test mode me hai to samne wala number **Test users** me add karo |
| Webhook verify fail | URL me `/webhook` aana chahiye, server chalu hona chahiye, verify token dono jagah same |
| Reply nahi aa raha | Server ke logs dekho: `FAILED to reply to ...` — wahan error code hoga |
| Number ka "display name" nahi set | Meta dashboard me business phone ka display name zaroor set karo |

---

## 🛡️ GitHub CI (optional — extra layer)

Har push par tests chalane ke liye repo me `.github/workflows/ci.yml` file banao:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Run tests
        run: npm test
```

(Is file push nahi ho paayi kyunki GitHub App ke paas `workflows` permission nahi thi —
apna account se add karo, ya repo Settings → GitHub Apps me "workflows" permission
enable karke dobara push karo.)

---

**Banaaya gaya: GitHub + WhatsApp Cloud API (official) — total cost Rs. 0** 👑
