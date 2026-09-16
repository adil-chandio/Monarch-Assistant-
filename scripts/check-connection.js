'use strict';

/**
 * Connection check — apne 3 values (token, phone number ID, WABA ID) ka
 * live validation, bina kisi message bheje.
 *
 *   npm run check
 *
 * Env vars (chahiye): WHATSAPP_TOKEN, PHONE_NUMBER_ID
 *              (optional): WHATSAPP_BUSINESS_ACCOUNT_ID, WHATSAPP_API_VERSION
 */

const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v25.0';
const GRAPH = 'https://graph.facebook.com';

async function get(path, token) {
  const res = await fetch(`${GRAPH}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function errHint(code, message) {
  const m = String(message || '');
  const c = Number(code);
  if (c === 190 || /invalid oauth|token/i.test(m)) return '→ Token galat ya expire hai. System user ka PERMANENT token use karo (whatsapp_business_messaging permission ke sath).';
  if (c === 10 || /permission/i.test(m)) return '→ Token ke paas permission nahi — token regenerate karo, in permissions ke sath: whatsapp_business_messaging + whatsapp_business_management.';
  if (c === 100 || /not found|does not exist/i.test(m)) return '→ Phone number ID ya WABA ID galat hai. Meta dashboard → WhatsApp → API Setup se dobara copy karo.';
  if (c === 401 || c === 403) return '→ Token is account ke liye allowed nahi.';
  return '';
}

(async () => {
  const token = process.env.WHATSAPP_TOKEN;
  const pni = process.env.PHONE_NUMBER_ID;
  const waba = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

  if (!token || !pni) {
    console.error('❌ Pehle env vars set karo: WHATSAPP_TOKEN, PHONE_NUMBER_ID  (dekh .env.example)');
    process.exit(1);
  }

  console.log('=== Monarch Assistant — connection check ===\n');

  // 1) Token + phone number info
  const pn = await get(`${API_VERSION}/${pni}?fields=id,display_name,verified_name,quality_rating,code_status,messaging_limits`, token);
  if (!pn.ok) {
    const e = (pn.data && pn.data.error) || {};
    console.error(`❌ Phone number API fail: ${e.message || 'unknown'} (code ${e.code || pn.status})`);
    const hint = errHint(e.code, e.message);
    if (hint) console.error(hint);
    process.exit(1);
  }

  const p = pn.data;
  console.log('✅ TOKEN VALID — phone number mil gaya:');
  console.log(`   ID            : ${p.id}`);
  console.log(`   Display name  : ${p.display_name || '⚠️ set NAHI hai — Meta dashboard me zaroor set karo, warna contacts ko message sender "unknown" dikhega'}`);
  console.log(`   Verified name : ${p.verified_name == null ? '-' : p.verified_name}`);
  const status = p.code_status || '-';
  console.log(`   Mode          : ${status}${status === 'testing' ? '  (⚠️ sirf Test Users bhej sakte hain — jo number test karna ho usay "Test users" me add karo)' : ''}`);
  console.log(`   Quality       : ${p.quality_rating || '-'}`);
  if (p.messaging_limits) console.log(`   Limits        : ${JSON.stringify(p.messaging_limits)}`);

  // 2) WABA (business account) — optional
  if (waba) {
    const w = await get(`${API_VERSION}/${waba}`, token);
    if (w.ok) {
      console.log(`\n✅ Business account (WABA) VALID: ${w.data.id} — name: ${w.data.name || '-'}`);
    } else {
      const e = (w.data && w.data.error) || {};
      console.error(`\n⚠️  WABA check fail: ${e.message || 'unknown'} (code ${e.code || w.status})`);
    }
  } else {
    console.log('\nℹ️  WHATSAPP_BUSINESS_ACCOUNT_ID nahi diya — skip kiya.');
  }

  console.log('\n👍 Ab aage: `npm start` chalao, phir Meta dashboard me webhook set karo (README Step 3).');
})().catch((e) => {
  console.error('❌ Network error:', e.message);
  console.error('   (Agar sandbox/computer se internet blocked hai to check host me chalega)');
  process.exit(1);
});
