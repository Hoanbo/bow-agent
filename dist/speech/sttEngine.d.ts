export interface SttTranscriptionOptions {
    language?: string;
    temperature?: number;
    preferLocal?: boolean;
    timeoutMs?: number;
    threads?: number;
    signal?: AbortSignal;
}
export interface SttTranscriptionResult {
    success: boolean;
    text: string;
    language: string;
    confidence?: number;
    durationSeconds?: number;
    backend: 'local_whisper_cpp' | 'local_whisper_vulkan' | 'cloud_whisper';
    latencyMs: number;
    vadDetectedSpeech?: boolean;
    error?: string;
}
export declare class VietnameseSttEngine {
    private whisperExe;
    private modelPath;
    private defaultTimeoutMs;
    constructor(options?: {
        whisperPath?: string;
        modelPath?: string;
        timeoutMs?: number;
    });
    /**
     * Status of local Whisper STT engine
     */
    getStatus(): {
        whisperAvailable: boolean;
        modelAvailable: boolean;
        whisperPath: string;
        modelPath: string;
    };
    /**
     * Fast Voice Activity Detection (VAD) to detect end-of-speech locally in < 100ms
     */
    detectVoiceActivity(audioBuffer: Buffer | string): {
        speechEnded: boolean;
        energyLevel: number;
    };
    /**
     * Transcribe audio buffer / base64 to Vietnamese text using local Whisper.cpp
     */
    transcribe(audioInput: Buffer | string, options?: SttTranscriptionOptions): Promise<SttTranscriptionResult>;
    private cleanupTemp;
}
export declare const sttEngine: VietnameseSttEngine;
