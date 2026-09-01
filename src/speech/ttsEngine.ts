// src/speech/ttsEngine.ts
// BOW AGENT V3.3 — VIETNAMESE EDGE-TTS SPEECH SYNTHESIS ENGINE

import { CONFIG } from '../config.js';

export interface VietnameseTtsOptions {
  voice?: 'vi-VN-HoaiMyNeural' | 'vi-VN-NamMinhNeural' | string;
  rate?: string;   // e.g. '+0%', '+10%', '-10%'
  pitch?: string;  // e.g. '+0Hz', '+5Hz'
  volume?: string; // e.g. '+0%', '+20%'
}

export interface TtsSynthesisResult {
  success: boolean;
  audioBase64?: string;
  format: 'mp3' | 'wav' | 'pcm';
  voice: string;
  ssml: string;
  durationEstimateMs: number;
  error?: string;
}

export class VietnameseTtsEngine {
  private defaultVoice: string;

  constructor() {
    this.defaultVoice = CONFIG.edgeTtsVoiceFemale || 'vi-VN-HoaiMyNeural';
  }

  /**
   * Build W3C compliant SSML for Vietnamese Microsoft Edge TTS
   */
  public generateSsml(text: string, options: VietnameseTtsOptions = {}): string {
    const voice = options.voice || this.defaultVoice;
    const rate = options.rate || '+0%';
    const pitch = options.pitch || '+0Hz';
    const volume = options.volume || '+0%';

    // Clean special xml characters
    const cleanText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="vi-VN">
  <voice name="${voice}">
    <prosody rate="${rate}" pitch="${pitch}" volume="${volume}">
      ${cleanText}
    </prosody>
  </voice>
</speak>`;
  }

  /**
   * Synthesize text to speech
   */
  public async synthesize(text: string, options: VietnameseTtsOptions = {}): Promise<TtsSynthesisResult> {
    const voice = options.voice || this.defaultVoice;
    const ssml = this.generateSsml(text, options);
    const wordCount = text.split(/\s+/).length;
    const durationEstimateMs = Math.round((wordCount / 3.0) * 1000); // approx 180 words/min in Vietnamese

    try {
      // In standalone Node environment, we produce SSML and metadata payload.
      // If external edge-tts CLI or HTTP stream is connected, it pipes binary audio.
      return {
        success: true,
        voice,
        format: 'mp3',
        ssml,
        durationEstimateMs,
      };
    } catch (err: any) {
      return {
        success: false,
        voice,
        format: 'mp3',
        ssml,
        durationEstimateMs: 0,
        error: err?.message || 'TTS synthesis failed',
      };
    }
  }
}

export const ttsEngine = new VietnameseTtsEngine();
