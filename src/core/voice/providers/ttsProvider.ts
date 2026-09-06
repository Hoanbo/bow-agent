// src/core/voice/providers/ttsProvider.ts
// BOWCON V4.0 — TTS PROVIDER ABSTRACTION INTERFACE (MILESTONE 1.3.5)

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
