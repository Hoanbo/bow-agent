// src/core/voice/speechTextProcessor.ts
// BOWCON V4.0 — SPEECH TEXT PREPROCESSOR & NORMALIZER (MILESTONE 1.3.6)
//
// Invariants:
// - INV-1 / INV-7: Original agent response text is NEVER modified (100% byte-for-byte immutable).
// - INV-2: Natural sentence segmentation.
// - INV-6: Technical pronunciation normalization.
// - INV-7: Numbers, symbols, currency, and durations speech normalization.

import { normalizeNumbersAndSymbols } from './speechNumberNormalizer.js';
import { normalizePronunciation } from './pronunciationNormalizer.js';
import { segmentSpeech, SpeechSegment } from './speechSegmenter.js';
import { planProsody, ProsodyPlan } from './voiceProsody.js';
import type { VoicePersonality } from './voicePersonality.js';

export interface SpeechProcessingOptions {
  language?: string;
  maxSpokenLength?: number;
  normalizeNumbers?: boolean;
  normalizePronunciation?: boolean;
  personality?: string | VoicePersonality;
}

export interface ProcessedSpeechResult {
  speechText: string;
  segments: SpeechSegment[];
  prosodyPlan: ProsodyPlan;
}

// Common decorative UI emojis that create awkward speech artifacts
const DECORATIVE_EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2300}-\u{23FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E0}-\u{1F1FF}\u{1F004}\u{1F0CF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu;

/**
 * Normalizes text for natural speech synthesis.
 * Strips markdown, technical code fences, and decorative emojis while preserving
 * natural sentence cadence and rhythm, and applies conversational pronunciation and number expansions.
 */
export function processTextForSpeech(text: string, options: SpeechProcessingOptions = {}): string {
  if (!text || typeof text !== 'string') return '';

  const language = options.language || 'vi-VN';
  const isVietnamese = language.toLowerCase().startsWith('vi');
  let result = text;

  // 1. Remove XML/HTML tags
  result = result.replace(/<[^>]+>/g, ' ');

  // 2. Convert fenced code blocks ```lang\ncode\n``` to concise spoken announcement
  result = result.replace(/```(?:[a-zA-Z0-9_-]+)?\s*[\r\n]+([\s\S]*?)```/g, (_match, code) => {
    const lineCount = code.trim().split(/\r?\n/).length;
    if (isVietnamese) {
      return ` [Đoạn mã ${lineCount} dòng] `;
    }
    return ` [Code snippet of ${lineCount} lines] `;
  });

  // 3. Convert inline code `code` to plain text
  result = result.replace(/`([^`]+)`/g, '$1');

  // 4. Convert Markdown links [Anchor](url) to anchor text
  result = result.replace(/\[([^\]]+)\]\((?:https?:\/\/[^\s)]+|file:\/\/[^\s)]+)\)/g, '$1');

  // 5. Simplify raw URLs (http:// or https://)
  result = result.replace(/https?:\/\/([a-zA-Z0-9.-]+)(?:\/[^\s]*)?/gi, (_match, host) => {
    const cleanHost = host.replace(/^www\./, '');
    if (isVietnamese) {
      return `trang web ${cleanHost}`;
    }
    return `website ${cleanHost}`;
  });

  // 6. Remove Markdown headers (#, ##, ###, etc.) at line starts
  result = result.replace(/^#{1,6}\s+(.*)$/gm, '$1.');

  // 7. Normalize bullet lists (- Item, * Item, + Item) to sentence pauses
  result = result.replace(/^[\s]*[-*+]\s+(.*)$/gm, '$1.');

  // 8. Normalize numbered lists (1. Item, 2. Item) to sentence pauses
  result = result.replace(/^[\s]*\d+\.\s+(.*)$/gm, '$1.');

  // 9. Remove Markdown bold and italic formatting (**bold**, *italic*, __bold__, _italic_)
  result = result.replace(/(\*\*|__)(.*?)\1/g, '$2');
  result = result.replace(/(\*|_)(.*?)\1/g, '$2');

  // 10. Remove Markdown blockquotes (> Quote)
  result = result.replace(/^>\s*(.*)$/gm, '$1.');

  // 11. Remove decorative emojis
  result = result.replace(DECORATIVE_EMOJI_REGEX, '');

  // 12. Normalize multiple punctuation (e.g. ".." or "..." to single pause, ".. " -> ". ")
  result = result.replace(/\.{2,}/g, '.');
  result = result.replace(/!{2,}/g, '!');
  result = result.replace(/\?{2,}/g, '?');

  // 13. Ensure sentence period before newlines so list items don't merge awkwardly
  result = result.replace(/([^\s.!?])\r?\n/g, '$1. ');

  // 14. Conversational number, symbol, and currency normalization (INV-7)
  if (options.normalizeNumbers !== false) {
    result = normalizeNumbersAndSymbols(result, language);
  }

  // 15. Conversational pronunciation normalization for technical terms & acronyms (INV-6)
  if (options.normalizePronunciation !== false) {
    result = normalizePronunciation(result, language);
  }

  // 16. Normalize whitespace
  result = result.replace(/\s+/g, ' ').trim();

  // 17. Clean up duplicate periods from previous replacements (e.g. ". .")
  result = result.replace(/\s*\.\s*\./g, '.');

  return result;
}

/**
 * Full pipeline: Preprocesses text, performs natural sentence segmentation,
 * and plans conversational prosody and pauses.
 */
export function processAndPlanSpeech(text: string, options: SpeechProcessingOptions = {}): ProcessedSpeechResult {
  const speechText = processTextForSpeech(text, options);
  const segments = segmentSpeech(speechText);
  const prosodyPlan = planProsody(segments, {
    personality: options.personality,
    language: options.language,
  });

  return {
    speechText,
    segments: prosodyPlan.segments,
    prosodyPlan,
  };
}
