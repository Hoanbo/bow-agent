// src/core/voice/speechSegmenter.ts
// BOWCON V4.0 — NATURAL SENTENCE SEGMENTATION (MILESTONE 1.3.6)
//
// Invariant (INV-2):
// Intelligently detects sentence and clause boundaries without splitting:
// - decimal numbers (3.14)
// - URLs (https://example.com/api)
// - email addresses (user@domain.com)
// - version numbers (4.0.0, V4.0)
// - file paths (src/core/voice.ts)
// - code identifiers (object.prop)
/**
 * Patterns that contain periods or colons but must NEVER be treated as sentence boundaries.
 */
const PROTECTED_PATTERNS = [
    // URLs: https://domain.com/path
    /https?:\/\/[^\s]+/gi,
    // Emails: name@domain.com
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    // File paths: src/core/voice.ts, C:\path\file.json
    /(?:[a-zA-Z]:[\\/]|(?:\.\.?[\\/])|(?:[a-zA-Z0-9_.-]+[\\/]))[a-zA-Z0-9_./\\-]+/g,
    // Version numbers: V4.0.0, v1.2, 4.0.0
    /\b[vV]?\d+\.\d+(?:\.\d+)*\b/g,
    // Decimal numbers: 3.14, 0.005
    /\b\d+\.\d+\b/g,
    // Code identifiers: Math.sin, record.ownerUserId
    /\b[a-zA-Z_$][a-zA-Z0-9_$]*\.[a-zA-Z_$][a-zA-Z0-9_$]*\b/g,
    // Common abbreviations
    /\b(?:Mr|Mrs|Ms|Dr|Prof|vs|eg|ie|approx|etc)\./gi,
];
/**
 * Classifies the semantic type of a speech segment for pacing and pauses.
 */
function classifySegment(text) {
    const trimmed = text.trim();
    const lower = trimmed.toLowerCase();
    // 1. Question
    if (trimmed.endsWith('?') || /^(tại sao|làm sao|ai|khi nào|ở đâu|cái gì|bao nhiêu|có phải|được không|như thế nào|why|how|what|who|when|where|is it|can you|could you)\b/i.test(lower)) {
        return 'question';
    }
    // 2. Short confirmation
    const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
    if (wordCount <= 4 && /^(đã xong|đã hoàn tất|vâng|rõ rồi|đồng ý|chính xác|ok|okay|yes|done|completed|understood)\b/i.test(lower)) {
        return 'short_confirmation';
    }
    // 3. Important / Alert / Conclusion
    if (trimmed.endsWith('!') || /\b(quan trọng|lưu ý|cảnh báo|nguy hiểm|chú ý|critical|warning|alert|error|thất bại|failed|success|thành công)\b/i.test(lower)) {
        return 'important';
    }
    // 4. Long explanation
    if (wordCount >= 20) {
        return 'explanation';
    }
    return 'normal';
}
/**
 * Segments raw or preprocessed speech text into structured conversational segments.
 */
export function segmentSpeech(text, options = {}) {
    if (!text || typeof text !== 'string' || !text.trim()) {
        return [];
    }
    // 1. Protect non-sentence periods/delimiters using lossless tokens
    const protectedTokens = [];
    let protectedText = text;
    for (const pattern of PROTECTED_PATTERNS) {
        protectedText = protectedText.replace(pattern, (match) => {
            const token = `__BOW_PROT_${protectedTokens.length}__`;
            protectedTokens.push(match);
            return token;
        });
    }
    // 2. Split on sentence boundaries:
    // - Delimiters: . ! ? : ; followed by whitespace, newline, or end-of-string
    // - Double newlines (paragraphs)
    const rawChunks = protectedText
        .split(/(?<=[.!?:]|\n\n+)(?:\s+|\r?\n+)/)
        .map(c => c.trim())
        .filter(Boolean);
    // 3. Restore protected tokens in each chunk
    const restoredChunks = [];
    for (const chunk of rawChunks) {
        let restored = chunk;
        for (let i = 0; i < protectedTokens.length; i++) {
            restored = restored.replace(new RegExp(`__BOW_PROT_${i}__`, 'g'), protectedTokens[i]);
        }
        if (restored.trim()) {
            restoredChunks.push(restored.trim());
        }
    }
    // 4. Build structured SpeechSegment objects
    const segments = restoredChunks.map((chunkText, index) => {
        const segmentType = classifySegment(chunkText);
        // Initial baseline pauses and speeds (refined further by Prosody Planner)
        let pauseAfterMs = 300;
        let speedMultiplier = 1.0;
        let emphasis = 'none';
        if (segmentType === 'question') {
            pauseAfterMs = 400;
            speedMultiplier = 1.0;
        }
        else if (segmentType === 'short_confirmation') {
            pauseAfterMs = 250;
            speedMultiplier = 1.06;
            emphasis = 'mild';
        }
        else if (segmentType === 'important') {
            pauseAfterMs = 450;
            speedMultiplier = 0.94;
            emphasis = 'strong';
        }
        else if (segmentType === 'explanation') {
            pauseAfterMs = 350;
            speedMultiplier = 0.94;
        }
        // Last segment natural trailing pause
        if (index === restoredChunks.length - 1) {
            pauseAfterMs = 200;
        }
        return {
            index,
            text: chunkText,
            spokenText: chunkText,
            pauseBeforeMs: index === 0 ? 0 : 50,
            pauseAfterMs,
            emphasis,
            speedMultiplier,
            segmentType,
        };
    });
    return segments;
}
