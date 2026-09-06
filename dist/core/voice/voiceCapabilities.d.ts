import type { AudioOutputFormat, VoiceConfig } from './voiceConfig.js';
export interface TTSCapabilities {
    providerId: string;
    supportedLanguages: string[];
    supportedFormats: AudioOutputFormat[];
    supportsStreaming: boolean;
    supportsPitch: boolean;
    supportsSpeed: boolean;
    supportsStyles: boolean;
    supportsSsml: boolean;
    supportsProsody: boolean;
    supportsEmphasis: boolean;
    supportsPronunciation: boolean;
    supportsSentenceLevelSynthesis: boolean;
    supportsVoiceStability: boolean;
    supportsStyleControl: boolean;
    maxTextLength: number;
}
export interface CapabilityNegotiationResult {
    canSynthesize: boolean;
    useSsml: boolean;
    useSentenceLevel: boolean;
    adjustedSpeed: boolean;
    adjustedPitch: boolean;
    unsupportedFeatures: string[];
}
/**
 * Negotiates requested voice configurations against a provider's declared capabilities.
 */
export declare function negotiateCapabilities(capabilities: TTSCapabilities, config: VoiceConfig, requestContext?: {
    wantsSentenceLevel?: boolean;
    wantsSsml?: boolean;
}): CapabilityNegotiationResult;
