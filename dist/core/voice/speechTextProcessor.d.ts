import { SpeechSegment } from './speechSegmenter.js';
import { ProsodyPlan } from './voiceProsody.js';
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
/**
 * Normalizes text for natural speech synthesis.
 * Strips markdown, technical code fences, and decorative emojis while preserving
 * natural sentence cadence and rhythm, and applies conversational pronunciation and number expansions.
 */
export declare function processTextForSpeech(text: string, options?: SpeechProcessingOptions): string;
/**
 * Full pipeline: Preprocesses text, performs natural sentence segmentation,
 * and plans conversational prosody and pauses.
 */
export declare function processAndPlanSpeech(text: string, options?: SpeechProcessingOptions): ProcessedSpeechResult;
