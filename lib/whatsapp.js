/**
 * Send a WhatsApp text message via the official WhatsApp Cloud API.
 *
 * Zero deps, pure Web `fetch` (works in Node 18+ AND Cloudflare Workers).
 * NOTE: no process.env here — pass apiVersion explicitly so the same code
 * runs in both environments.
 */

export const GRAPH_BASE = 'https://graph.facebook.com';
export const DEFAULT_API_VERSION = 'v25.0';

/**
 * @param {object} opts
 * @param {string} opts.token          WhatsApp Cloud API access token
 * @param {string} opts.phoneNumberId  Business phone number ID (not the number itself)
 * @param {string} opts.to             Recipient phone number, e.g. "923001234567"
 * @param {string} opts.body           Message text
 * @param {string} [opts.apiVersion]   Graph API version, default v25.0
 * @param {string} [opts.contextMessageId] Optional wamid to quote/reply to
 */
export async function sendText({ token, phoneNumberId, to, body, apiVersion, contextMessageId }) {
  const version = apiVersion || DEFAULT_API_VERSION;
  const url = `${GRAPH_BASE}/${version}/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { preview_url: false, body },
  };
  if (contextMessageId) {
    payload.context = { message_id: contextMessageId };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = (data && data.error) || {};
    throw new Error(
      `WhatsApp send failed: ${err.message || 'unknown error'} (code ${err.code || res.status})`
    );
  }
  return data;
}
