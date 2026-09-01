export interface SttTranscriptionOptions {
    language?: string;
    temperature?: number;
}
export interface SttTranscriptionResult {
    success: boolean;
    text: string;
    language: string;
    confidence?: number;
    durationSeconds?: number;
    error?: string;
}
export declare class VietnameseSttEngine {
    private fasterWhisperUrl;
    constructor();
    /**
     * Transcribe audio buffer / base64 to Vietnamese text
     */
    transcribe(audioBuffer: Buffer | string, options?: SttTranscriptionOptions): Promise<SttTranscriptionResult>;
}
export declare const sttEngine: VietnameseSttEngine;
