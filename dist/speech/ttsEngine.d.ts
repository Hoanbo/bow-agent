export interface VietnameseTtsOptions {
    voice?: 'vi-VN-HoaiMyNeural' | 'vi-VN-NamMinhNeural' | string;
    rate?: string;
    pitch?: string;
    volume?: string;
}
export interface TtsSynthesisResult {
    success: boolean;
    audioBase64?: string;
    format: 'mp3' | 'wav' | 'pcm';
    voice: string;
    ssml: string;
    durationEstimateMs: number;
    error?: string;
}
export declare class VietnameseTtsEngine {
    private defaultVoice;
    constructor();
    /**
     * Build W3C compliant SSML for Vietnamese Microsoft Edge TTS
     */
    generateSsml(text: string, options?: VietnameseTtsOptions): string;
    /**
     * Synthesize text to speech
     */
    synthesize(text: string, options?: VietnameseTtsOptions): Promise<TtsSynthesisResult>;
}
export declare const ttsEngine: VietnameseTtsEngine;
