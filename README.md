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
| Code + versioning + tests | **GitHub** (is repo) | Free |
| Webhook receive + reply (24/7) | **Cloudflare Workers** (`worker.js`) ya Node server (`server.js`) | Free |
| Auto-deploy (push hote hi) | Worker: `wrangler deploy` / Render: GitHub connect | Free |

Total kharcha: **0 rupees.**

### Hosting ka mukayisa (September 2026 — researched)

| Platform | Free? | 24/7 bina soye? | Reply speed | Verdict |
|---|---|---|---|---|
| **Cloudflare Workers** | ✅ 100k requests/din, bina card | ✅ **Kabhi nahi soota** (global edge) | ~1-2 sec | **BEST — recommended** |
| Render free | ✅ 750 ghante/mahina, bina card | ❌ 15 min idle pe soota, 30-60 sec jagta | Idle ke baad pehla reply slow | Aasan, backup option |
| Freebuff Cloud | ✅ sandbox | ❓ idle pe so sakta hai (test karna) | Test ke baad pata chalega | Testing ke liye theek |
| Google e2-micro VPS | ✅ hamesha free (US region) + 30GB | ✅ asli VPS | ~1 sec | Chahiye to full control |
| Oracle A1 VPS | ✅ hamesha free (2026 me 2 OCPU/12GB half kiya) + 200GB | ✅ asli VPS | ~1 sec (Singapore = PK ke liye fast) | Sab se zyada taqat, lekin "capacity" lottery + manual setup |
| Fly.io | ❌ free tier khatam (sirf 2 ghante trial) | ✅ | ~1 sec | ~Rs. 500-700/mahina — free nahi |
| AWS | ❌ naye accounts me $200 credit / 6 mahina, phir paid | ✅ | ~1 sec | "Forever free" nahi raha |

**Is liye Workers best hai:** assistant ka kaam *stateless* hai (message aaya → reply gaya),
toh Workers ka model uske liye perfect hai — na koi server soota hai, na mahine ka
hour-meter, na VPS ka manual setup. 100k requests/din ki limit hamare assistant
(10-50 messages/din) ke liye ~2000x se zyada hai.

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

### Step 2 — Deploy karo (4 options — pehla recommended)

#### Option A — Cloudflare Workers (RECOMMENDED — 24/7 zinda, Rs. 0, bina card)
Ye version **kabhi nahi soota** — global edge par rehta hai, cold start ~1 second se kam.

```bash
# 1) repo me jao
git clone <repo-url> && cd Monarch-Assistant

# 2) free Cloudflare account (free.cloudflare.com) se login karo
npx wrangler login        # browser khulega, "Allow" dabao

# 3) secrets set karo (values screen par paste hongi — repo me NAHI jaayengi)
npx wrangler secret put WHATSAPP_TOKEN
npx wrangler secret put PHONE_NUMBER_ID
npx wrangler secret put WHATSAPP_PHONE
npx wrangler secret put WEBHOOK_VERIFY_TOKEN   # value: monarch-assistant-verify

# 4) deploy
npx wrangler deploy
```

Deploy ke baad URL milega: `https://monarch-assistant.<aapka-subdomain>.workers.dev`
Meta dashboard me webhook URL: `https://monarch-assistant.<subdomain>.workers.dev/webhook`

Har code update ke baad dobara `npx wrangler deploy` — bas itna. (Ya dashboard se
browser me deploy bhi kar sakte ho: Cloudflare dashboard → Workers → Upload.)

#### Option B — Render (aasan, lekin 15 min idle pe so jaata hai)
1. [render.com](https://render.com) pe free account banao (credit card NAHI chahiye).
2. **New + → Blueprint** → apna GitHub repo (`Monarch-Assistant`) select karo → `render.yaml` khud detect ho jayega.
3. Wo values poochega jo daalo:
   - `WHATSAPP_TOKEN` = apna permanent token
   - `PHONE_NUMBER_ID` = Step 1 ka ID
   - `WHATSAPP_PHONE` = apna business number digits me (e.g. `923001234567`)
4. Deploy ho jaye → URL milega jaise `https://monarch-assistant.onrender.com`.
5. Aage ke har push/PR par Render **auto-deploy** karega (repo GitHub se connected hai).

> ⚠️ Free Render ~15 min traffic nahi aaya to **so** jata hai; agle message par 30-60 sec
> jagta hai. 24/7 instant reply chahiye to Option A (Workers) lo.

#### Option C — Freebuff Cloud (free cloud sandbox, repo connect karke)
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
> late aaya ya nahi aaya to permanent host ke liye Option A (Cloudflare Workers) use karo.

#### Option D — Koi aur VPS / shared host (Google e2-micro, Oracle A1, ya koi bhi)
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

**Google Cloud free VPS** ke liye yaad rakho: machine **e2-micro** honi chahiye, region
**us-west1 / us-central1 / us-east1** me, disk **Standard** 30GB — warna free nahi hai.
**Oracle** me A1 (2 OCPU/12GB, 200GB disk) free hai — Singapore region Pakistan ke liye
sab se fast hai, lekin kabhi-kabhi "out of capacity" aata hai.

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
   - Workers wala ho to: `https://monarch-assistant.<subdomain>.workers.dev/webhook`
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

## 🫀 Zinda Rakhne Ka System (24/7 liveness — forensic analysis)

Bot ko "marne" se kya cheezein bachati hain — poori failure-mode analysis:

### Bot ko kya kya mar sakta hai (aur kaise bachna hai)

| # | Failure mode | Kisko hit hota hai | Kya hota hai | Protection (is system me) |
|---|---|---|---|---|
| 1 | **Host so jata hai** (idle sleep) | Render (15 min), Freebuff (unknown) | Pehla reply 30-60 sec late (Render) — yahi worst case hai, kyunki Meta ka POST khud host jagata hai | **UptimeRobot heartbeat (neeche)** — har 5 min ping → host kabhi nahi soota |
| 2 | **Host 21+ ghante dead** | Koi bhi | Meta 8 baar retry karta hai (1min → 5min → 15min → 1h → 2h → 6h → 12h), phir **webhook KOI BAND nahi — DISABLE ho jata hai** → messages aane hi band | UptimeRobot **5 min me alert** (email) → fix → Meta dashboard me webhook re-subscribe (2 min ka kaam) |
| 3 | **Reply processing slow** (Graph API timeout) | Sab (rare) | Meta ka 3-10 sec timeout exceed → retry → double reply risk | **FIXED is code me:** ack-first pattern — Meta ko turant 200, reply background me (Workers: `ctx.waitUntil` max 30 sec). Timeout ab impossible |
| 4 | **Worker 100k requests/day cross** | Workers | Error 1027 — worker 24h ke liye band | Assistant ~50 req/din use karta hai → **2000x margin**. Dashboard → Analytics se track |
| 5 | **Token expire/regenerate** | Sab | Har reply fail (code 190/131044), logs me `FAILED to reply` | `npm run check` se pata chalta hai; naya token set karo (Workers: `wrangler secret put`) |
| 6 | **Number quality drop** | Sab | Meta messaging limit daalta hai | Hum sirf **user-initiated** (contact ne pehle message kiya) replies bhejte hain — yeh Meta ke rules me safe hai. Spam-like bulk bhejna mat |

**Zaroori fact (Meta retry semantics):** Agar host thori der down raha to message **lose nahi hota** —
Meta upar wale schedule par redelivery karta hai (max 7 din). Risk sirf tab hai jab host 21+ ghante
lagataar dead rahe (failure #2) — wahi UptimeRobot 5 min me pakad leta hai.

### Layer 1 — Heartbeat: UptimeRobot (free, bina card)

Koi bhi host par (Render/Freebuff/VPS/Workers) lagao:

1. [uptimerobot.com](https://uptimerobot.com) pe free account (50 monitors, 5-min check, email alerts)
2. **Add Monitor** → Type: **HTTP(s)** → URL: `https://<aapka-host>/` (health endpoint) → Interval: **5 minutes**
3. Alert contact: aapka email → Save

**Double faida:**
- 🛡️ **Monitoring** — host girte hi 5 min me email aayega
- ☕ **Keep-alive** — har 5 min ka ping Render/Freebuff ko jagaye rehta hai (15-min sleep threshold se pehle),
  to "so jana" wala problem #1 **poora khatam** — reply hamesha 2-5 sec me

Workers par heartbeat optional hai (wo kabhi nahi soota) lekin monitoring ke liye bhi acha hai.

### Layer 2 — 24-hour Soak Test (certification)

Deploy ke baad ye karo — phir aap 100% pakka ho sakte ho:

1. Aaj shaam 1 test message bhejo ✅
2. Raat 12 baje (ya 2-3 ghante baad) 1 test message bhejo ✅
3. Subah uthte hi 1 test message bhejo ✅
4. Har ek **2-5 second** me reply aaye to → **ZINDA CERTIFIED** 🏅

### Layer 3 — Webhook re-subscribe (sirf failure #2 me)

Agar UptimeRobot ne 21+ ghante down ka alert diya ho: Meta dashboard → WhatsApp →
Webhooks → apna callback select karo → fields (`messages`) dobara select → **Subscribe**.
Bas — system wapas zinda.

**Poora system ka kharcha: Rs. 0** (Workers free + UptimeRobot free + GitHub free)

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
| `worker.js` + `wrangler.toml` | **Cloudflare Workers edition (24/7, Option A)** — `npx wrangler deploy` |
| `server.js` | Node webhook server (Option B/C/D) — zero dependencies |
| `lib/detect.js` | Language detection (Urdu / English / Roman Urdu) |
| `lib/replies.js` | **Sir wali 3 zabaanon me reply lines** (yahan se customize karo) |
| `lib/whatsapp.js` | WhatsApp Cloud API se message bhejna (Graph v25.0) |
| `bot.test.js` + `worker.test.js` | 18 unit tests (`npm test`) |
| `scripts/check-connection.js` | Token/WABA validation (`npm run check`) |
| `Dockerfile` | Docker deploy ke liye (kisi bhi host/VPS pe) |
| `render.yaml` | Render one-click deploy (Blueprint) |

---

## ⚠️ Limitations / Notes

- **Reply time:** Cloudflare Workers par reply **~1-2 second** me, 24/7, bina soye.
  Render free par ~15 min idle ke baad pehla reply 30-60 sec me aata hai, baad me turant.
  (Meta agar webhook dobara bhejta hai to dedupe se bacha jata hai — double reply nahi hota.)
- **Workers free limit:** 100,000 requests/din — assistant ye limit door tak nahi pahunchta.
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
