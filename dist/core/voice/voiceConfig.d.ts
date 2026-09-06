import type { VoicePersonality, VoicePersonalityPreset } from './voicePersonality.js';
export type AudioOutputFormat = 'audio/mpeg' | 'audio/wav' | 'audio/pcm';
export declare const SUPPORTED_AUDIO_FORMATS: readonly AudioOutputFormat[];
export declare const DEFAULT_VOICE_TIMEOUT_MS = 10000;
export declare const DEFAULT_MAX_TEXT_LENGTH = 5000;
export declare const MAX_ALLOWED_TEXT_LENGTH = 50000;
export declare const MIN_ALLOWED_TEXT_LENGTH = 1;
/**
 * Voice runtime configuration model.
 */
export interface VoiceConfig {
    enabled?: boolean;
    provider?: string;
    voiceId?: string;
    language?: string;
    speed?: number;
    pitch?: number;
    volume?: number;
    outputFormat?: AudioOutputFormat;
    sampleRate?: number;
    style?: string;
    stability?: number;
    similarity?: number;
    instructions?: string;
    timeoutMs?: number;
    maxTextLength?: number;
    outputDir?: string;
    personality?: string | VoicePersonality;
    personalityPreset?: VoicePersonalityPreset;
    enableProsody?: boolean;
    enableSentenceLevel?: boolean;
    fallbackProviders?: string[];
}
/**
 * Contextual voice synthesis request payload.
 */
export interface VoiceSynthesisRequest {
    text: string;
    userId?: string;
    sessionId?: string;
    language?: string;
    voiceConfig?: VoiceConfig;
    metadata?: Record<string, any>;
}
/**
 * Output structure returned by synthesis operations.
 */
export interface VoiceSynthesisResponse {
    success: boolean;
    provider: string;
    audioFormat: AudioOutputFormat;
    audioData?: Buffer | Uint8Array;
    filePath?: string;
    durationMs?: number;
    speechText: string;
    error?: string;
    metadata?: Record<string, any>;
}
export type VoiceResult = VoiceSynthesisResponse;
/**
 * Runtime schema validator for VoiceConfig with prototype pollution and path traversal protection.
 */
export declare function validateVoiceConfig(config: unknown): {
    valid: boolean;
    config?: VoiceConfig;
    errors?: string[];
};
