import type { SpeechSegment } from './speechSegmenter.js';
import type { VoicePersonality } from './voicePersonality.js';
export interface ProsodyOptions {
    personality?: string | VoicePersonality;
    language?: string;
}
export interface ProsodyPlan {
    segments: SpeechSegment[];
    overallSpeakingRate: number;
    totalEstimatedPauseMs: number;
    ssmlRepresentation?: string;
}
/**
 * Plans pauses, speaking rate, and emphasis across all speech segments based on
 * sentence semantics and the configured voice personality.
 */
export declare function planProsody(segments: SpeechSegment[], options?: ProsodyOptions): ProsodyPlan;
/**
 * Builds standard SSML document from planned segments for providers that support SSML.
 */
export declare function generateSsml(segments: SpeechSegment[]): string;
