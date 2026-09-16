'use strict';

const GRAPH_BASE = 'https://graph.facebook.com';

/**
 * Send a WhatsApp text message via the official WhatsApp Cloud API.
 *
 * @param {object} opts
 * @param {string} opts.token          WhatsApp Cloud API access token
 * @param {string} opts.phoneNumberId  The business phone number ID (not the number itself)
 * @param {string} opts.to             Recipient phone number, e.g. "923001234567"
 * @param {string} opts.body           Message text
 * @param {string} [opts.apiVersion]   Graph API version, default v25.0
 * @param {string} [opts.contextMessageId] Optional wamid to quote/reply to
 */
async function sendText({ token, phoneNumberId, to, body, apiVersion, contextMessageId }) {
  const version = apiVersion || process.env.WHATSAPP_API_VERSION || 'v25.0';
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
    const err = data && data.error ? data.error : {};
    throw new Error(
      `WhatsApp send failed: ${err.message || 'unknown error'} (code ${err.code || res.status})`
    );
  }
  return data;
}

module.exports = { sendText, GRAPH_BASE };
