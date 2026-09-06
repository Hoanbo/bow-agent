import type { TTSProvider, TTSCapabilities } from './providers/ttsProvider.js';
import { VoiceConfig, VoiceSynthesisRequest, VoiceResult } from './voiceConfig.js';
export declare class VoiceService {
    private providers;
    private defaultProviderId;
    constructor(initialProviders?: TTSProvider[]);
    /**
     * Registers or replaces a TTS provider adapter.
     */
    registerProvider(provider: TTSProvider): void;
    /**
     * Retrieves a registered provider by its identifier.
     */
    getProvider(providerId?: string): TTSProvider | undefined;
    /**
     * Inspects static capabilities of a registered provider.
     */
    getCapabilities(providerId?: string): TTSCapabilities | undefined;
    /**
     * Lists all registered provider identifiers.
     */
    listProviders(): string[];
    /**
     * Sets the fallback default provider identifier.
     */
    setDefaultProvider(providerId: string): void;
    /**
     * Validates a voice configuration against service bounds and provider limits.
     */
    validateConfiguration(config: VoiceConfig): {
        valid: boolean;
        errors?: string[];
    };
    /**
     * Core voice synthesis execution path.
     *
     * Guarantees:
     * - Does NOT modify request.text (Text Integrity INV-1 / INV-7).
     * - Executes speech normalization, sentence segmentation, and prosody planning.
     * - Handles sentence-level synthesis and audio assembly when enabled.
     * - Executes deterministic provider fallback if primary fails (INV-13).
     * - Times out cleanly after configured deadline without hanging.
     * - Returns structured VoiceResult; never throws unhandled exceptions to caller.
     * - Sanitizes error messages to prevent secret leaks (INV-15).
     */
    synthesize(request: VoiceSynthesisRequest): Promise<VoiceResult>;
    /**
     * Streaming-ready interface contract (Section 8, 22, INV-12).
     */
    synthesizeStream(request: VoiceSynthesisRequest): AsyncIterable<Buffer | Uint8Array>;
    /**
     * Wraps a promise with an explicit deadline timeout.
     */
    private executeWithTimeout;
    /**
     * Persists synthesized audio data to an enforced, sandboxed directory.
     */
    private persistAudioToDisk;
}
/**
 * Authoritative global voice service singleton.
 */
export declare const globalVoiceService: VoiceService;
