import type { TTSProvider, TTSCapabilities } from './ttsProvider.js';
import type { VoiceConfig, VoiceSynthesisRequest, VoiceSynthesisResponse } from '../voiceConfig.js';
export declare const OPENAI_VOICES: readonly ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
export declare class OpenAiTtsProvider implements TTSProvider {
    private readonly defaultVoice;
    private readonly defaultModel;
    private readonly apiEndpoint;
    getProviderId(): string;
    getCapabilities(): TTSCapabilities;
    validate(config: VoiceConfig): {
        valid: boolean;
        errors?: string[];
    };
    synthesize(request: VoiceSynthesisRequest): Promise<VoiceSynthesisResponse>;
    synthesizeStream(request: VoiceSynthesisRequest): AsyncIterable<Buffer>;
}
