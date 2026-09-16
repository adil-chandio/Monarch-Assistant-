/**
 * Monarch Assistant — Cloudflare Workers edition.
 *
 * YE version 24/7 "zinda" rehta hai:
 *   - Cloudflare free plan: 100,000 requests/day, kabhi sleep NAHI karta,
 *     global edge par (Pakistan se bhi fast), cold start ~1 second se kam.
 *   - Assistant sirf ek handful requests/day use karta hai — limit door tak nahi.
 *
 * Same brain jaisa Node server (lib/detect.js, lib/replies.js, lib/whatsapp.js).
 *
 * Secrets (dashboard ya CLI se set karte hain):
 *   wrangler secret put WHATSAPP_TOKEN
 *   wrangler secret put PHONE_NUMBER_ID
 *   wrangler secret put WHATSAPP_PHONE          (optional — apna number)
 *   wrangler secret put WEBHOOK_VERIFY_TOKEN    (optional)
 */

import { detectLanguage } from './lib/detect.js';
import { buildReply } from './lib/replies.js';
import { sendText } from './lib/whatsapp.js';

// In-memory dedupe (per isolate). Meta sirf non-200 par redelivery karta hai,
// hum hamesha 200 return karte hain — is liye double reply ka risk minimal hai.
const seen = new Map();
function alreadySeen(id) {
  if (!id) return false;
  if (seen.has(id)) return true;
  seen.set(id, Date.now());
  if (seen.size > 2000) seen.delete(seen.keys().next().value);
  return false;
}

function isOwnNumber(from, ownPhone) {
  if (!ownPhone) return false;
  const digits = String(from || '').replace(/\D/g, '');
  const own = String(ownPhone).replace(/\D/g, '');
  return own !== '' && (digits === own || digits.endsWith(own));
}

async function handleValue(value, env) {
  const phoneId = (value.metadata && value.metadata.phone_number_id) || env.PHONE_NUMBER_ID;
  for (const message of value.messages || []) {
    const from = message.from || '';
    const id = message.id;

    if (isOwnNumber(from, env.WHATSAPP_PHONE)) continue;
    if (from.endsWith('@g.us')) continue;
    if (alreadySeen(id)) continue;
    if (message.type !== 'text') continue;

    const body = (message.text && message.text.body) || '';
    const language = detectLanguage(body);
    const reply = buildReply(language);

    try {
      await sendText({
        token: env.WHATSAPP_TOKEN,
        phoneNumberId: phoneId,
        to: from,
        body: reply,
        apiVersion: env.WHATSAPP_API_VERSION,
        contextMessageId: id,
      });
      console.log(`replied to ${from} in [${language}] (msg ${id})`);
    } catch (err) {
      console.error(`FAILED to reply to ${from}:`, err && err.message);
    }
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const verifyToken = env.WEBHOOK_VERIFY_TOKEN || 'monarch-assistant-verify';

    // GET: Meta webhook verification + health check (kisi bhi path par)
    if (request.method === 'GET') {
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');
      if (mode === 'subscribe' && token === verifyToken) {
        return new Response(challenge || '', { headers: { 'content-type': 'text/plain' } });
      }
      return new Response('Monarch Assistant (Workers) is alive. Waiting for WhatsApp messages...\n', {
        headers: { 'content-type': 'text/plain' },
      });
    }

    // POST: incoming messages
    if (request.method === 'POST') {
      let payload;
      try {
        payload = await request.json();
      } catch {
        return new Response('bad json', { status: 400 });
      }
      for (const entry of payload.entry || []) {
        for (const change of (entry && entry.changes) || []) {
          const value = change && change.value;
          if (value && value.messaging_product === 'whatsapp' && (value.messages || []).length) {
            await handleValue(value, env);
          }
        }
      }
      return Response.json({ received: true });
    }

    return new Response('not found', { status: 404 });
  },
};
