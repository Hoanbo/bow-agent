import type { TTSProvider, TTSCapabilities } from './ttsProvider.js';
import type { VoiceConfig, VoiceSynthesisRequest, VoiceSynthesisResponse } from '../voiceConfig.js';
export declare class ElevenLabsProvider implements TTSProvider {
    private readonly defaultVoiceId;
    private readonly baseUrl;
    getProviderId(): string;
    getCapabilities(): TTSCapabilities;
    validate(config: VoiceConfig): {
        valid: boolean;
        errors?: string[];
    };
    synthesize(request: VoiceSynthesisRequest): Promise<VoiceSynthesisResponse>;
    synthesizeStream(request: VoiceSynthesisRequest): AsyncIterable<Buffer>;
}
