import type { AudioOutputFormat } from './voiceConfig.js';
export interface AudioChunk {
    audioData: Buffer | Uint8Array;
    format: AudioOutputFormat;
    pauseAfterMs?: number;
    sampleRate?: number;
}
export declare class AudioAssembler {
    /**
     * Generates a buffer of 16-bit mono PCM silence.
     */
    static createPcmSilence(durationMs: number, sampleRate?: number): Buffer;
    /**
     * Validates that a buffer starts with a valid standard RIFF WAV header.
     */
    static isValidWavBuffer(buf: Buffer): {
        valid: boolean;
        sampleRate?: number;
        dataOffset?: number;
        dataSize?: number;
        error?: string;
    };
    /**
     * Assembles multiple WAV chunks into a single continuous valid RIFF WAV buffer.
     */
    static assembleWav(chunks: AudioChunk[], defaultSampleRate?: number): Buffer;
    /**
     * Assembles multiple raw PCM chunks into a single continuous PCM buffer.
     */
    static assemblePcm(chunks: AudioChunk[], sampleRate?: number): Buffer;
    /**
     * Assembles multiple MP3 chunks into a single continuous MP3 stream.
     */
    static assembleMp3(chunks: AudioChunk[]): Buffer;
    /**
     * Assembles chunks according to their common output format.
     */
    static assemble(chunks: AudioChunk[], format?: AudioOutputFormat, sampleRate?: number): Buffer;
}
