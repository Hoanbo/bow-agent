export interface VoicePersonality {
    name: string;
    warmth: number;
    confidence: number;
    energy: number;
    expressiveness: number;
    speakingRate: number;
    pauseIntensity: number;
    emphasisIntensity: number;
}
export type VoicePersonalityPreset = 'CALM_ASSISTANT' | 'SMART_ASSISTANT' | 'PROFESSIONAL' | 'JARVIS_INSPIRED';
export declare const VOICE_PERSONALITY_PRESETS: Record<VoicePersonalityPreset, VoicePersonality>;
/**
 * Validates a candidate object against the VoicePersonality contract.
 */
export declare function validateVoicePersonality(input: unknown): {
    valid: boolean;
    personality?: VoicePersonality;
    errors?: string[];
};
/**
 * Resolves a personality model from a preset name or custom object.
 */
export declare function resolveVoicePersonality(input?: string | VoicePersonality | VoicePersonalityPreset): VoicePersonality;
