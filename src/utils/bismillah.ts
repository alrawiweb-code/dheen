/**
 * bismillah.ts
 *
 * Zero-dependency utility for removing Bismillah from Quran ayah text.
 * Deliberately isolated so it can be imported anywhere without risk of
 * circular deps or module-load failures from heavier service modules.
 *
 * Algorithm: strips Arabic diacritics (harakat) from a working copy of the
 * text, then locates الرحيم (the last word of Bismillah) by root letters
 * only — immune to any diacritic encoding differences between data sources.
 */

/** Arabic harakat / superscript alef / tatweel code-point ranges */
const DIACRITIC_RE = /[\u064B-\u065F\u0670\u0640]/g;

/** Root letters: ا ل ر ح ي م (standard alef) */
const RAHIM_BARE_1 = '\u0627\u0644\u0631\u062d\u064a\u0645';

/** Root letters: ٱ ل ر ح ي م (uthmani alef wasla) */
const RAHIM_BARE_2 = '\u0671\u0644\u0631\u062d\u064a\u0645';

/** Root letters: ب س م  (first word of Bismillah) */
const BSM_START = '\u0628\u0633\u0645';

/**
 * Removes "Bismillah ir-Rahman ir-Rahim" from the start of an ayah text.
 * Works for ALL Unicode diacritic variants (uthmani, hafs, plain Arabic).
 * Returns the original text unchanged if Bismillah is not found at the start.
 */
export function removeBismillahFromText(text: string): string {
  if (!text) return text;

  // 1. Strip diacritics for root-letter matching
  const bare = text.replace(DIACRITIC_RE, '');

  // 2. Must start with بسم
  if (!bare.startsWith(BSM_START)) return text;

  // 3. Find الرحيم within first 80 bare characters (Bismillah is ~20-40 chars)
  const rahimIdx1 = bare.indexOf(RAHIM_BARE_1);
  const rahimIdx2 = bare.indexOf(RAHIM_BARE_2);
  const rahimIdx = rahimIdx1 !== -1 ? rahimIdx1 : rahimIdx2;

  if (rahimIdx === -1 || rahimIdx > 80) return text;

  // 4. bareEndPos = index right after the م of الرحيم in the bare string
  const bareEndPos = rahimIdx + RAHIM_BARE_1.length; // both variants are the same length

  // 5. Map bareEndPos back to a position in the ORIGINAL text by walking
  //    character-by-character and counting only non-diacritic characters.
  let bareCount = 0;
  let origPos = 0;
  while (origPos < text.length && bareCount < bareEndPos) {
    const cp = text.codePointAt(origPos) ?? 0;
    const isDiac =
      (cp >= 0x064b && cp <= 0x065f) || cp === 0x0670 || cp === 0x0640;
    if (!isDiac) bareCount++;
    origPos += cp > 0xffff ? 2 : 1;
  }

  // 6. Slice off the Bismillah prefix and trim any leading whitespace
  return text.slice(origPos).trimStart();
}
