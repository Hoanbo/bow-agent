// src/core/voice/providers/elevenLabsProvider.ts
// BOWCON V4.0 — ELEVENLABS TTS PROVIDER ADAPTER (MILESTONE 1.3.5)
//
// Reality Level: PARTIAL (Plumbed for real ElevenLabs Text-to-Speech API; requires ELEVENLABS_API_KEY)

import type { TTSProvider, TTSCapabilities } from './ttsProvider.js';
import type { VoiceConfig, VoiceSynthesisRequest, VoiceSynthesisResponse, AudioOutputFormat } from '../voiceConfig.js';
import { VoiceProviderUnavailableError, VoiceProviderError } from '../voiceErrors.js';

export class ElevenLabsProvider implements TTSProvider {
  private readonly defaultVoiceId: string = '21m00Tcm4TlvDq8ikWAM'; // Rachel
  private readonly baseUrl: string = 'https://api.elevenlabs.io/v1/text-to-speech';

  public getProviderId(): string {
    return 'elevenlabs';
  }

  public getCapabilities(): TTSCapabilities {
    return {
      providerId: 'elevenlabs',
      supportedLanguages: ['vi-VN', 'en-US', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP', 'zh-CN'],
      supportedFormats: ['audio/mpeg', 'audio/wav', 'audio/pcm'],
      supportsStreaming: true,
      supportsPitch: false,
      supportsSpeed: true,
      supportsStyles: true,
      supportsSsml: false,
      supportsProsody: true,
      supportsEmphasis: true,
      supportsPronunciation: false,
      supportsSentenceLevelSynthesis: true,
      supportsVoiceStability: true,
      supportsStyleControl: true,
      maxTextLength: 10_000,
    };
  }

  public validate(config: VoiceConfig): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (config.stability !== undefined && (config.stability < 0.0 || config.stability > 1.0)) {
      errors.push(`ElevenLabs stability must be between 0.0 and 1.0, got: ${config.stability}`);
    }

    if (config.similarity !== undefined && (config.similarity < 0.0 || config.similarity > 1.0)) {
      errors.push(`ElevenLabs similarity must be between 0.0 and 1.0, got: ${config.similarity}`);
    }

    return { valid: errors.length === 0, errors };
  }

  public async synthesize(request: VoiceSynthesisRequest): Promise<VoiceSynthesisResponse> {
    const apiKey = (request.voiceConfig as any)?.apiKey || process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new VoiceProviderUnavailableError('ElevenLabs API key is not configured (requires ELEVENLABS_API_KEY).');
    }

    const voiceId = request.voiceConfig?.voiceId || this.defaultVoiceId;
    const format = request.voiceConfig?.outputFormat || 'audio/mpeg';

    const formatQuery = format === 'audio/wav' ? 'output_format=pcm_24000' : 'output_format=mp3_44100_128';
    const endpoint = `${this.baseUrl}/${voiceId}?${formatQuery}`;

    const voiceSettings = {
      stability: request.voiceConfig?.stability ?? 0.5,
      similarity_boost: request.voiceConfig?.similarity ?? 0.75,
      style: request.voiceConfig?.style ? 0.3 : 0.0,
      use_speaker_boost: true,
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': format === 'audio/wav' ? 'audio/wav' : 'audio/mpeg',
        },
        body: JSON.stringify({
          text: request.text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: voiceSettings,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new VoiceProviderError(`ElevenLabs request failed with status ${response.status}: ${errorText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);

      return {
        success: true,
        provider: 'elevenlabs',
        audioFormat: format,
        audioData: audioBuffer,
        speechText: request.text,
        metadata: {
          voiceId,
          model: 'eleven_multilingual_v2',
          byteLength: audioBuffer.length,
        },
      };
    } catch (err: any) {
      if (err instanceof VoiceProviderError || err instanceof VoiceProviderUnavailableError) {
        throw err;
      }
      throw new VoiceProviderError(`ElevenLabs execution failure: ${err?.message || 'Network error'}`);
    }
  }

  public async *synthesizeStream(request: VoiceSynthesisRequest): AsyncIterable<Buffer> {
    const res = await this.synthesize(request);
    if (res.audioData) {
      yield Buffer.isBuffer(res.audioData) ? res.audioData : Buffer.from(res.audioData);
    }
  }
}
