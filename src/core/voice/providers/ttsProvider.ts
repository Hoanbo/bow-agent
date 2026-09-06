// src/core/voice/providers/ttsProvider.ts
// BOWCON V4.0 — TTS PROVIDER ABSTRACTION INTERFACE (MILESTONE 1.3.5)

// EN: TTSProvider is the stable provider boundary. VoiceService depends on this contract,
// not on a vendor SDK, so providers can be replaced without changing AgentLoop behavior.
// VI: TTSProvider là ranh giới provider ổn định. VoiceService phụ thuộc vào contract này,
// không phụ thuộc SDK của nhà cung cấp, nên provider có thể được thay thế mà không đổi AgentLoop.

import type { VoiceConfig, VoiceSynthesisRequest, VoiceSynthesisResponse, AudioOutputFormat } from '../voiceConfig.js';
import type { TTSCapabilities } from '../voiceCapabilities.js';

export type { TTSCapabilities };

/**
 * Authoritative provider-independent contract for text-to-speech synthesis engines.
 */
export interface TTSProvider {
  /**
   * Unique identifier of this provider (e.g. 'openai', 'elevenlabs', 'mock').
   */
  getProviderId(): string;

  /**
   * Static or dynamic capabilities exposed by this provider.
   */
  getCapabilities(): TTSCapabilities;

  /**
   * Validates whether a given VoiceConfig is supported by this provider.
   */
  validate(config: VoiceConfig): { valid: boolean; errors?: string[] };

  /**
   * Synthesizes text into audio data.
   */
  synthesize(request: VoiceSynthesisRequest): Promise<VoiceSynthesisResponse>;

  /**
   * Optional streaming synthesis interface for future streaming audio pipelines.
   */
  synthesizeStream?(request: VoiceSynthesisRequest): AsyncIterable<Buffer | Uint8Array>;
}
