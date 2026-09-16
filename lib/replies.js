/**
 * The assistant's role — Monarch sir ka personal assistant.
 *
 * Rules (from Monarch sir):
 *  1. Hamesha pehle:
 *     "Assalam-o-Alaikum, Monarch sir abhi busy hain, aapko jald hi reply mil jayega."
 *  2. Phir pucho:
 *     "Batayen main aapki kya madad kar sakta hun? Aapka naam aur kaam bata den
 *     taake sir aate hi aapse contact kar len."
 *  3. Kabhi nahi kehte ke hum AI hain — sirf assistant ki tarah baat karte hain.
 *  4. Language usi me rakhni hai jis me samne wala baat kar raha ho
 *     (Urdu / English / Roman Urdu).
 */

export const REPLIES = {
  // Roman Urdu — sir wali exact lines (default)
  roman: [
    'Assalam-o-Alaikum, Monarch sir abhi busy hain, aapko jald hi reply mil jayega.',
    'Batayen main aapki kya madad kar sakta hun? Aapka naam aur kaam bata den taake sir aate hi aapse contact kar len.',
  ],

  // English
  english: [
    'Assalam-o-Alaikum! Monarch sir is a little busy right now — you will get his reply soon.',
    'May I know how I can help you? Please share your name and what you need, so sir can get back to you as soon as he is available.',
  ],

  // Urdu (Nastaliq script)
  urdu: [
    'السلام علیکم! موناکھ سار جی ابھی تھوڑی مشغولی میں ہیں، آپ کو جلد ہی ان کا جواب ضرور مل جائے گا۔',
    'بتائیں میں آپ کی کیا مدد کر سکتا ہوں؟ اپنا نام اور اپنا کام ضرور بتائیں تاکہ سار جی آتے ہی آپ سے رابطہ کر لیں۔',
  ],
};

/**
 * Build the full reply (both lines) for a language.
 * Unknown language codes fall back to 'roman'.
 */
export function buildReply(language) {
  const lines = REPLIES[language] || REPLIES.roman;
  return lines.join('\n\n');
}
