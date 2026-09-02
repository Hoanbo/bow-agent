export interface VietnameseTtsOptions {
    voice?: 'vi-VN-HoaiMyNeural' | 'vi-VN-NamMinhNeural' | string;
    rate?: string;
    pitch?: string;
    volume?: string;
    engine?: 'local_fast' | 'cloud_edge' | 'auto';
}
export interface TtsSynthesisResult {
    success: boolean;
    audioBase64?: string;
    format: 'mp3' | 'wav' | 'pcm';
    voice: string;
    ssml: string;
    durationEstimateMs: number;
    engineUsed: 'local_fast' | 'cloud_edge';
    audioLatencyMs: number;
    error?: string;
}
export declare class VietnameseTtsEngine {
    private defaultVoice;
    constructor();
    /**
     * Status report of the hybrid TTS subsystem
     */
    getTtsStatus(): {
        preferLocal: boolean;
        activeEngine: string;
        fallbackEngine: string;
        latencyTargetMs: number;
        status: string;
    };
    /**
     * Build W3C compliant SSML for Vietnamese Microsoft Edge TTS
     */
    generateSsml(text: string, options?: VietnameseTtsOptions): string;
    /**
     * Synthesize text to speech with sub-50ms local engine prioritization
     */
    synthesize(text: string, options?: VietnameseTtsOptions): Promise<TtsSynthesisResult>;
}
export declare const ttsEngine: VietnameseTtsEngine;
