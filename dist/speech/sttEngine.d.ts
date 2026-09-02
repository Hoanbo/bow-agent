export interface SttTranscriptionOptions {
    language?: string;
    temperature?: number;
    preferLocal?: boolean;
}
export interface SttTranscriptionResult {
    success: boolean;
    text: string;
    language: string;
    confidence?: number;
    durationSeconds?: number;
    backend: 'local_whisper_vulkan' | 'cloud_whisper';
    latencyMs: number;
    vadDetectedSpeech?: boolean;
    error?: string;
}
export declare class VietnameseSttEngine {
    private localWhisperUrl;
    private fasterWhisperUrl;
    constructor();
    /**
     * Fast Voice Activity Detection (VAD) to detect end-of-speech locally in < 100ms
     */
    detectVoiceActivity(audioBuffer: Buffer | string): {
        speechEnded: boolean;
        energyLevel: number;
    };
    /**
     * Transcribe audio buffer / base64 to Vietnamese text using Local Whisper Vulkan
     */
    transcribe(audioBuffer: Buffer | string, options?: SttTranscriptionOptions): Promise<SttTranscriptionResult>;
}
export declare const sttEngine: VietnameseSttEngine;
