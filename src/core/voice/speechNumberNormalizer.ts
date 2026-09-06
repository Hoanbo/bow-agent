// src/core/voice/speechNumberNormalizer.ts
// BOWCON V4.0 — NUMBER & SYMBOL SPEECH NORMALIZER (MILESTONE 1.3.6)
//
// Invariant (INV-7):
// Safe conversational conversion for numbers, currency, percentages, version numbers,
// durations, and technical status codes for spoken audio representation.
// The original agent response text is NEVER modified.

export function normalizeNumbersAndSymbols(text: string, language: string = 'vi-VN'): string {
  if (!text || typeof text !== 'string') return '';

  const isVietnamese = language.toLowerCase().startsWith('vi');
  let result = text;

  // 1. Durations (e.g. 15,000ms, 15000ms, 500ms, 60s)
  result = result.replace(/\b(\d{1,3}(?:,\d{3})*|\d+)\s*ms\b/gi, (_match, digits) => {
    const cleanNum = parseInt(digits.replace(/,/g, ''), 10);
    if (cleanNum >= 1000 && cleanNum % 1000 === 0) {
      const sec = cleanNum / 1000;
      return isVietnamese ? `${sec} giây` : `${sec} seconds`;
    }
    return isVietnamese ? `${cleanNum} mili giây` : `${cleanNum} milliseconds`;
  });

  result = result.replace(/\b(\d+)\s*s\b/gi, (_match, digits) => {
    return isVietnamese ? `${digits} giây` : `${digits} seconds`;
  });

  // 2. Percentages (e.g. 100%, 99.5%)
  result = result.replace(/\b(\d+(?:\.\d+)?)\s*%/g, (_match, num) => {
    return isVietnamese ? `${num} phần trăm` : `${num} percent`;
  });

  // 3. Currency
  // Vietnamese Dong: 20.000đ, 20,000 VND, 500k, 500000 VND
  result = result.replace(/(\d{1,3}(?:\.\d{3})+|\d+)\s*(?:đ|vnd|đồng)(?![a-zA-Z0-9])/gi, (_match, amount) => {
    return isVietnamese ? `${amount} đồng` : `${amount} VND`;
  });

  // USD: $20, $20.50, 20$
  result = result.replace(/\$(\d+(?:\.\d+)?)/g, (_match, amount) => {
    return isVietnamese ? `${amount} đô la` : `${amount} dollars`;
  });
  result = result.replace(/\b(\d+(?:\.\d+)?)\s*\$/g, (_match, amount) => {
    return isVietnamese ? `${amount} đô la` : `${amount} dollars`;
  });

  // EUR: €50, 50€
  result = result.replace(/€(\d+(?:\.\d+)?)/g, (_match, amount) => {
    return isVietnamese ? `${amount} ơ rô` : `${amount} euros`;
  });
  result = result.replace(/\b(\d+(?:\.\d+)?)\s*€/g, (_match, amount) => {
    return isVietnamese ? `${amount} ơ rô` : `${amount} euros`;
  });

  // 4. Version numbers (e.g. V4.0.0, v4.0, 4.0.0)
  result = result.replace(/\b[vV](\d+)\.(\d+)(?:\.(\d+))?\b/g, (_match, maj, min, patch) => {
    if (patch !== undefined) {
      return isVietnamese
        ? `phiên bản ${maj} chấm ${min} chấm ${patch}`
        : `version ${maj} point ${min} point ${patch}`;
    }
    return isVietnamese
      ? `phiên bản ${maj} chấm ${min}`
      : `version ${maj} point ${min}`;
  });

  result = result.replace(/\b(\d+)\.(\d+)\.(\d+)\b/g, (_match, maj, min, patch) => {
    return isVietnamese
      ? `${maj} chấm ${min} chấm ${patch}`
      : `${maj} point ${min} point ${patch}`;
  });

  // 5. Technical HTTP status codes (e.g. HTTP 401, HTTP 200, HTTP 500)
  result = result.replace(/\bHTTP\s+(401|403|404|500|502|503)\b/gi, (_match, code) => {
    return isVietnamese ? `mã lỗi HTTP ${code}` : `HTTP error code ${code}`;
  });

  result = result.replace(/\bHTTP\s+(200|201|204)\b/gi, (_match, code) => {
    return isVietnamese ? `mã thành công HTTP ${code}` : `HTTP status ${code}`;
  });

  return result;
}
