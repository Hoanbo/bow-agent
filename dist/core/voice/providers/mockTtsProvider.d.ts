import type { TTSProvider, TTSCapabilities } from './ttsProvider.js';
import type { VoiceConfig, VoiceSynthesisRequest, VoiceSynthesisResponse } from '../voiceConfig.js';
export declare class MockTtsProvider implements TTSProvider {
    private simulatedDelayMs;
    private simulatedFailure;
    private mockSupportsSentenceLevel;
    private mockSupportsSsml;
    getProviderId(): string;
    getCapabilities(): TTSCapabilities;
    setSimulatedDelay(ms: number): void;
    setSimulatedFailure(errorMessage: string | null): void;
    setSupportsSentenceLevel(supported: boolean): void;
    setSupportsSsml(supported: boolean): void;
    validate(config: VoiceConfig): {
        valid: boolean;
        errors?: string[];
    };
    /**
     * Builds a genuine, valid standard 44-byte RIFF WAV audio buffer containing
     * synthesized 16-bit PCM audio.
     */
    static createValidWavBuffer(durationMs: number, sampleRate?: number): Buffer;
    synthesize(request: VoiceSynthesisRequest): Promise<VoiceSynthesisResponse>;
    synthesizeStream(request: VoiceSynthesisRequest): AsyncIterable<Buffer>;
}
