// src/core/voice/pronunciationNormalizer.ts
// BOWCON V4.0 — PRONUNCIATION NORMALIZER (MILESTONE 1.3.6)
//
// Invariant (INV-6):
// Improves pronunciation for English technical terms, acronyms, software names,
// and developer terminology without altering the primary user-facing textual response.

export interface PronunciationDictionary {
  [term: string]: {
    vi: string;
    en: string;
  };
}

export const TECHNICAL_PRONUNCIATION_MAP: PronunciationDictionary = {
  API: { vi: 'Ây-Pi-Ai', en: 'A-P-I' },
  JWT: { vi: 'J-W-T', en: 'J-W-T' },
  Supabase: { vi: 'Su-pa-base', en: 'Supa-base' },
  GitHub: { vi: 'Gít-háp', en: 'Git-Hub' },
  JSON: { vi: 'J-son', en: 'J-son' },
  TTS: { vi: 'T-T-S', en: 'T-T-S' },
  SDK: { vi: 'S-D-K', en: 'S-D-K' },
  URL: { vi: 'U-R-L', en: 'U-R-L' },
  HTML: { vi: 'H-T-M-L', en: 'H-T-M-L' },
  CSS: { vi: 'C-S-S', en: 'C-S-S' },
  SQL: { vi: 'S-Q-L', en: 'S-Q-L' },
  CLI: { vi: 'C-L-I', en: 'C-L-I' },
  REST: { vi: 'Rest', en: 'Rest' },
  GraphQL: { vi: 'Gờ-ráp-Q-L', en: 'Graph-Q-L' },
  Vite: { vi: 'Vít', en: 'Veet' },
  NextJS: { vi: 'Nếch-J-S', en: 'Next-J-S' },
  React: { vi: 'Ri-ác', en: 'React' },
  OAuth: { vi: 'Ô-Ót', en: 'O-Auth' },
};

/**
 * Normalizes technical terms and acronyms into natural phonetics for spoken audio.
 */
export function normalizePronunciation(text: string, language: string = 'vi-VN'): string {
  if (!text || typeof text !== 'string') return '';

  const isVietnamese = language.toLowerCase().startsWith('vi');
  let result = text;

  // Process dictionary replacements using word boundaries
  for (const [term, pronunciations] of Object.entries(TECHNICAL_PRONUNCIATION_MAP)) {
    const replacement = isVietnamese ? pronunciations.vi : pronunciations.en;
    const regex = new RegExp(`\\b${term}\\b`, 'g');
    result = result.replace(regex, replacement);
  }

  return result;
}
