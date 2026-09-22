export type PiperErrorCode = 'SUCCESS' | 'SYNTHESIS_FAILED' | 'MODEL_NOT_FOUND' | 'PIPER_NOT_FOUND' | 'INVALID_AUDIO' | 'TIMEOUT' | 'ABORTED' | 'UNSUPPORTED_TEXT';
export interface PiperTtsOptions {
    modelPath?: string;
    configPath?: string;
    piperPath?: string;
    timeoutMs?: number;
    outputWavPath?: string;
    returnBase64?: boolean;
    speakerId?: number;
    signal?: AbortSignal;
}
export interface PiperTtsResult {
    success: boolean;
    errorCode: PiperErrorCode;
    audioBase64?: string;
    wavFilePath?: string;
    sampleRate: number;
    durationMs: number;
    byteLength?: number;
    error?: string;
}
export declare class PiperTtsEngine {
    private piperExe;
    private modelPath;
    private configPath;
    private defaultTimeoutMs;
    constructor(options?: {
        piperPath?: string;
        modelPath?: string;
        configPath?: string;
        timeoutMs?: number;
    });
    /**
     * Status check of Piper binary and Duy Oryx ONNX model
     */
    getStatus(): {
        piperAvailable: boolean;
        modelAvailable: boolean;
        piperPath: string;
        modelPath: string;
    };
    /**
     * Synthesizes Vietnamese text to real WAV audio using standalone Piper with Duy Oryx model.
     */
    synthesize(text: string, options?: PiperTtsOptions): Promise<PiperTtsResult>;
}
export declare const globalPiperTtsEngine: PiperTtsEngine;
