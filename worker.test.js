/**
 * Cloudflare Workers edition ke liye tests.
 * worker.fetch(request, env) ko Node me seedha call karte hain
 * (Node 22 me Request/Response globals hain) — fetch stub karke
 * check karte hain ke WhatsApp API par sahi request jaati hai.
 */
import test from 'node:test';
import { after } from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.js';

const ENV = {
  WHATSAPP_TOKEN: 'FAKE_TOKEN',
  PHONE_NUMBER_ID: '999',
  WHATSAPP_PHONE: '923001112222',
  WEBHOOK_VERIFY_TOKEN: 'monarch-assistant-verify',
};

const sent = [];
const realFetch = globalThis.fetch;
const stubFetch = async (url, opts) => {
  sent.push({ url, opts });
  return {
    ok: true,
    status: 200,
    json: async () => ({ messaging_product: 'whatsapp', messages: [{ id: 'wamid.OUT' }] }),
  };
};
globalThis.fetch = stubFetch; // tests ke dauran stub active rahega

function incoming(body, { from = '923009998887', id = 'wamid.UNIQUE' } = {}) {
  return JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '1',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: { phone_number_id: '999' },
              messages: [{ id, from, to: '923001112222', timestamp: '1758000000', type: 'text', text: { body } }],
            },
          },
        ],
      },
    ],
  });
}

async function post(raw) {
  const waiters = [];
  const ctx = { waitUntil: (p) => waiters.push(p) };
  const res = await worker.fetch(
    new Request('https://monarch-assistant.example.workers.dev/webhook', {
      method: 'POST',
      body: raw,
      headers: { 'content-type': 'application/json' },
    }),
    ENV,
    ctx
  );
  await Promise.allSettled(waiters); // reply kaam (background job) mukammal hone tak ruko
  return res;
}

test('worker: GET verify returns challenge', async () => {
  const res = await worker.fetch(
    new Request('https://x.workers.dev/webhook?hub.mode=subscribe&hub.verify_token=monarch-assistant-verify&hub.challenge=CH4LL'),
    ENV
  );
  assert.equal(res.status, 200);
  assert.equal(await res.text(), 'CH4LL');
});

test('worker: GET wrong verify token -> health text, not challenge', async () => {
  const res = await worker.fetch(
    new Request('https://x.workers.dev/webhook?hub.mode=subscribe&hub.verify_token=WRONG&hub.challenge=CH'),
    ENV
  );
  assert.match(await res.text(), /alive/);
});

test('worker: GET health (no params)', async () => {
  const res = await worker.fetch(new Request('https://x.workers.dev/'), ENV);
  assert.equal(res.status, 200);
  assert.match(await res.text(), /alive/);
});

test('worker: roman incoming -> sir wali roman reply, quote ke sath', async () => {
  sent.length = 0;
  const res = await post(incoming('kya hal hai bhai, meeting ke liye message kiya', { id: 'wamid.W1' }));
  assert.equal(res.status, 200);
  assert.equal(sent.length, 1);
  assert.match(sent[0].url, /graph\.facebook\.com\/v25\.0\/999\/messages$/);
  assert.equal(sent[0].opts.headers.Authorization, 'Bearer FAKE_TOKEN');
  const req = JSON.parse(sent[0].opts.body);
  assert.equal(req.to, '923009998887');
  assert.equal(req.recipient_type, 'individual');
  assert.equal(req.context.message_id, 'wamid.W1');
  assert.match(req.text.body, /Assalam-o-Alaikum, Monarch sir abhi busy hain/);
  assert.match(req.text.body, /Aapka naam aur kaam bata den/);
});

test('worker: english incoming -> english reply', async () => {
  sent.length = 0;
  await post(incoming('Hello, I need your help with the meeting tomorrow', { id: 'wamid.W2' }));
  assert.equal(sent.length, 1);
  assert.match(JSON.parse(sent[0].opts.body).text.body, /Monarch sir is a little busy/);
});

test('worker: urdu incoming -> urdu reply', async () => {
  sent.length = 0;
  await post(incoming('السلام علیکم، میں علی ہوں، رابطہ کرنا تھا', { id: 'wamid.W3' }));
  assert.equal(sent.length, 1);
  assert.match(JSON.parse(sent[0].opts.body).text.body, /موناکھ سار جی/);
});

test('worker: own number -> koi reply nahi', async () => {
  sent.length = 0;
  await post(incoming('test from self', { from: '923001112222', id: 'wamid.W4' }));
  assert.equal(sent.length, 0);
});

test('worker: group message -> koi reply nahi', async () => {
  sent.length = 0;
  await post(incoming('group test', { from: '120363123456789-123456@g.us', id: 'wamid.W5' }));
  assert.equal(sent.length, 0);
});

test('worker: duplicate wamid -> double reply nahi', async () => {
  sent.length = 0;
  await post(incoming('dup', { id: 'wamid.DUP1' }));
  await post(incoming('dup again', { id: 'wamid.DUP1' }));
  assert.equal(sent.length, 1);
});

test('worker: non-200 WhatsApp API error par bhi 200 (Meta ko redelivery mat do)', async () => {
  sent.length = 0;
  const badFetch = async () => ({
    ok: false,
    status: 400,
    json: async () => ({ error: { message: 'test error', code: 131026 } }),
  });
  globalThis.fetch = badFetch;
  const res = await post(incoming('error case', { id: 'wamid.W6' }));
  globalThis.fetch = stubFetch;
  assert.equal(res.status, 200); // Meta ko 200 do warna redelivery loop
});

// Module load time par restore NAHI — tests ke baad restore karo:
after(() => {
  globalThis.fetch = realFetch;
});
