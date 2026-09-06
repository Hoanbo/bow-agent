// src/core/voice/providers/openAiTtsProvider.ts
// BOWCON V4.0 — OPENAI TTS PROVIDER ADAPTER (MILESTONE 1.3.5)
//
// Reality Level: PARTIAL (Plumbed for real OpenAI Audio Speech API; requires OPENAI_API_KEY)

import type { TTSProvider, TTSCapabilities } from './ttsProvider.js';
import type { VoiceConfig, VoiceSynthesisRequest, VoiceSynthesisResponse, AudioOutputFormat } from '../voiceConfig.js';
import { VoiceProviderUnavailableError, VoiceProviderError, VoiceConfigurationError } from '../voiceErrors.js';
import { CONFIG } from '../../../config.js';

export const OPENAI_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;

export class OpenAiTtsProvider implements TTSProvider {
  private readonly defaultVoice: string = 'alloy';
  private readonly defaultModel: string = 'tts-1';
  private readonly apiEndpoint: string = 'https://api.openai.com/v1/audio/speech';

  public getProviderId(): string {
    return 'openai';
  }

  public getCapabilities(): TTSCapabilities {
    return {
      providerId: 'openai',
      supportedLanguages: ['vi-VN', 'en-US', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP', 'ko-KR', 'zh-CN'],
      supportedFormats: ['audio/mpeg', 'audio/wav', 'audio/pcm'],
      supportsStreaming: true,
      supportsPitch: false,
      supportsSpeed: true,
      supportsStyles: false,
      supportsSsml: false,
      supportsProsody: false,
      supportsEmphasis: false,
      supportsPronunciation: false,
      supportsSentenceLevelSynthesis: true,
      supportsVoiceStability: false,
      supportsStyleControl: false,
      maxTextLength: 4096,
    };
  }

  public validate(config: VoiceConfig): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (config.voiceId && !OPENAI_VOICES.includes(config.voiceId as any)) {
      errors.push(`Invalid OpenAI voiceId: "${config.voiceId}". Must be one of: ${OPENAI_VOICES.join(', ')}`);
    }

    if (config.speed !== undefined && (config.speed < 0.25 || config.speed > 4.0)) {
      errors.push(`OpenAI speed must be between 0.25 and 4.0, got: ${config.speed}`);
    }

    if (config.outputFormat && !['audio/mpeg', 'audio/wav', 'audio/pcm'].includes(config.outputFormat)) {
      errors.push(`Unsupported OpenAI output format: "${config.outputFormat}"`);
    }

    return { valid: errors.length === 0, errors };
  }

  public async synthesize(request: VoiceSynthesisRequest): Promise<VoiceSynthesisResponse> {
    const apiKey = (request.voiceConfig as any)?.apiKey || CONFIG.openaiApiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new VoiceProviderUnavailableError('OpenAI TTS API key is not configured (requires OPENAI_API_KEY).');
    }

    const voice = request.voiceConfig?.voiceId || this.defaultVoice;
    const speed = request.voiceConfig?.speed || 1.0;
    const format = request.voiceConfig?.outputFormat || 'audio/mpeg';

    const formatMap: Record<AudioOutputFormat, string> = {
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
      'audio/pcm': 'pcm',
    };

    const payload = {
      model: this.defaultModel,
      input: request.text,
      voice,
      response_format: formatMap[format] || 'mp3',
      speed,
    };

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown HTTP error');
        throw new VoiceProviderError(`OpenAI TTS request failed with status ${response.status}: ${errorText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);

      return {
        success: true,
        provider: 'openai',
        audioFormat: format,
        audioData: audioBuffer,
        speechText: request.text,
        metadata: {
          model: this.defaultModel,
          voice,
          speed,
          byteLength: audioBuffer.length,
        },
      };
    } catch (err: any) {
      if (err instanceof VoiceProviderError || err instanceof VoiceProviderUnavailableError) {
        throw err;
      }
      throw new VoiceProviderError(`OpenAI TTS execution failure: ${err?.message || 'Network error'}`);
    }
  }

  public async *synthesizeStream(request: VoiceSynthesisRequest): AsyncIterable<Buffer> {
    const res = await this.synthesize(request);
    if (res.audioData) {
      yield Buffer.isBuffer(res.audioData) ? res.audioData : Buffer.from(res.audioData);
    }
  }
}
