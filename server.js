/**
 * Monarch Assistant — WhatsApp Cloud API webhook server (Node.js).
 *
 * Zero dependencies (plain Node http). Is file se server chalta hai:
 *   - Freebuff / Render / kisi bhi host par (Node 18+)
 *   - VPS par Docker se (Dockerfile)
 *
 *  GET  /webhook  -> Meta webhook verification (hub.challenge) + health check
 *  POST /webhook  -> incoming message -> auto reply in the sender's language
 *
 * Env vars:
 *   WHATSAPP_TOKEN          (required) Cloud API access token
 *   PHONE_NUMBER_ID         (required) business phone number ID
 *   WHATSAPP_PHONE          (optional) your own number digits — messages from it are ignored
 *   WEBHOOK_VERIFY_TOKEN    (optional) verify token used in Meta dashboard
 *   WHATSAPP_API_VERSION    (optional) e.g. v25.0
 *   PORT                    (optional) default 3000
 */

import http from 'node:http';
import { detectLanguage } from './lib/detect.js';
import { buildReply } from './lib/replies.js';
import { sendText } from './lib/whatsapp.js';

const PORT = Number(process.env.PORT || 3000);
const TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const OWN_PHONE = (process.env.WHATSAPP_PHONE || '').replace(/\D/g, '');
const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'monarch-assistant-verify';
const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v25.0';

if (!TOKEN || !PHONE_NUMBER_ID) {
  console.error('ERROR: set WHATSAPP_TOKEN and PHONE_NUMBER_ID environment variables');
  process.exit(1);
}

// Tiny in-memory dedupe so a Meta redelivery never double-replies.
const seen = new Map(); // messageId -> timestamp
const SEEN_TTL_MS = 10 * 60 * 1000;
function alreadySeen(id) {
  if (!id) return false;
  const now = Date.now();
  for (const [k, t] of seen) {
    if (now - t > SEEN_TTL_MS) seen.delete(k);
  }
  if (seen.has(id)) return true;
  seen.set(id, now);
  if (seen.size > 2000) seen.delete(seen.keys().next().value);
  return false;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > 1_000_000) {
        reject(new Error('payload too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function isOwnNumber(from) {
  if (!OWN_PHONE) return false;
  const digits = String(from || '').replace(/\D/g, '');
  return digits === OWN_PHONE || digits.endsWith(OWN_PHONE);
}

async function handleValue(value) {
  const phoneId = (value.metadata && value.metadata.phone_number_id) || PHONE_NUMBER_ID;
  for (const message of value.messages || []) {
    const from = message.from || '';
    const id = message.id;

    if (isOwnNumber(from)) {
      console.log(`skip: message from own number (${id})`);
      continue;
    }
    if (from.endsWith('@g.us')) {
      console.log(`skip: group message (${id})`);
      continue;
    }
    if (alreadySeen(id)) {
      console.log(`skip: duplicate webhook delivery (${id})`);
      continue;
    }
    if (message.type !== 'text') {
      console.log(`note: non-text message type "${message.type}" from ${from} — no reply in v1`);
      continue;
    }

    const body = (message.text && message.text.body) || '';
    const language = detectLanguage(body);
    const reply = buildReply(language);

    try {
      await sendText({
        token: TOKEN,
        phoneNumberId: phoneId,
        to: from,
        body: reply,
        apiVersion: API_VERSION,
        contextMessageId: id,
      });
      console.log(`replied to ${from} in [${language}] (msg ${id})`);
    } catch (err) {
      console.error(`FAILED to reply to ${from}: ${err.message}`);
    }
  }
}

const server = http.createServer(async (req, res) => {
  let url;
  try {
    url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  } catch {
    res.writeHead(400);
    res.end('bad request');
    return;
  }

  const isWebhook = url.pathname === '/webhook' || url.pathname === '/';

  // --- Meta webhook verification + health check -------------------------
  if (req.method === 'GET' && isWebhook) {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('webhook verified by Meta');
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(challenge || '');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Monarch Assistant is alive. Waiting for WhatsApp messages...\n');
    return;
  }

  // --- Incoming messages --------------------------------------------------
  if (req.method === 'POST' && isWebhook) {
    try {
      const raw = await readBody(req);
      let payload;
      try {
        payload = JSON.parse(raw);
      } catch {
        res.writeHead(400);
        res.end('bad json');
        return;
      }
      for (const entry of payload.entry || []) {
        for (const change of (entry && entry.changes) || []) {
          const value = change && change.value;
          if (value && value.messaging_product === 'whatsapp' && (value.messages || []).length) {
            // Meta best practice: pehle 200 do, phir kaam karo.
            // (Reply processing background me hoti hai — Meta ke timeout
            // window ko kabhi exceed nahi hota, is liye no redelivery/duplicates.)
            void handleValue(value).catch((e) => console.error('webhook job error:', e.message));
          }
        }
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ received: true }));
    } catch (err) {
      console.error('webhook error:', err.message);
      res.writeHead(500);
      res.end('internal error');
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('not found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Monarch Assistant listening on port ${PORT} (webhook: /webhook)`);
});
