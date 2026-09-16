/**
 * Language detection for incoming WhatsApp messages.
 *
 * Returns one of:
 *   'urdu'   -> message written in Urdu/Arabic script
 *   'english'-> message looks like English
 *   'roman'  -> Roman Urdu (default / fallback)
 *
 * Heuristic, zero deps, pure Web APIs (works in Node AND Cloudflare Workers).
 */

// Words that are (almost) never used in Roman Urdu.
// Deliberately excluded (overlap with Roman Urdu): is, it, to, or, so, me,
// sir, call, link, payment, order, name? -> "name" kept but protected by ratio.
const ENGLISH_WORDS = new Set([
  'the', 'and', 'for', 'are', 'you', 'how', 'what', 'please', 'hello',
  'hi', 'hey', 'name', 'work', 'help', 'with', 'this', 'that', 'from',
  'have', 'can', 'will', 'would', 'need', 'want', 'about', 'tell', 'say',
  'when', 'where', 'who', 'why', 'thanks', 'thank', 'ok', 'okay', 'yes',
  'no', 'not', 'all', 'just', 'like', 'here', 'there', 'now', 'your',
  'our', 'they', 'we', 'she', 'he', 'but', 'very', 'well', 'good',
  'fine', 'sorry', 'dear', 'business', 'meeting', 'tomorrow', 'today',
  'night', 'morning', 'evening', 'after', 'before', 'again', 'still',
  'already', 'really', 'much', 'more', 'some', 'any', 'each', 'other',
  'new', 'old', 'time', 'day', 'date', 'month', 'year', 'friend',
  'family', 'house', 'office', 'school', 'hospital', 'doctor', 'car',
  'bike',
]);

export function detectLanguage(raw) {
  const text = String(raw == null ? '' : raw).trim();
  if (!text) return 'roman';

  // 1) Urdu / Arabic script
  if (/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text)) {
    return 'urdu';
  }

  // 2) ASCII/English check
  const words = text.toLowerCase().match(/[a-z']{2,}/g) || [];
  if (words.length < 2) return 'roman';

  const hits = words.reduce((n, w) => (ENGLISH_WORDS.has(w) ? n + 1 : n), 0);
  // Need >= 2 English words AND a solid share (protects Roman Urdu lines
  // containing 1 loanword like "hello" or "ok").
  if (hits >= 2 && hits / words.length >= 0.3) return 'english';

  return 'roman';
}
