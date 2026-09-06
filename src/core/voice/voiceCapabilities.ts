// src/core/voice/voiceCapabilities.ts
// BOWCON V4.0 — TTS PROVIDER CAPABILITIES & NEGOTIATION (MILESTONE 1.3.6)
//
// Invariant (INV-9):
// VoiceService negotiates provider capabilities at runtime.
// If an advanced capability (SSML, prosody, emphasis) is unsupported by a provider,
// the voice pipeline degrades gracefully without failing the synthesis request.

import type { AudioOutputFormat, VoiceConfig } from './voiceConfig.js';

export interface TTSCapabilities {
  providerId: string;
  supportedLanguages: string[];
  supportedFormats: AudioOutputFormat[];
  supportsStreaming: boolean;
  supportsPitch: boolean;
  supportsSpeed: boolean;
  supportsStyles: boolean;
  supportsSsml: boolean;
  supportsProsody: boolean;
  supportsEmphasis: boolean;
  supportsPronunciation: boolean;
  supportsSentenceLevelSynthesis: boolean;
  supportsVoiceStability: boolean;
  supportsStyleControl: boolean;
  maxTextLength: number;
}

export interface CapabilityNegotiationResult {
  canSynthesize: boolean;
  useSsml: boolean;
  useSentenceLevel: boolean;
  adjustedSpeed: boolean;
  adjustedPitch: boolean;
  unsupportedFeatures: string[];
}

/**
 * Negotiates requested voice configurations against a provider's declared capabilities.
 */
export function negotiateCapabilities(
  capabilities: TTSCapabilities,
  config: VoiceConfig,
  requestContext?: { wantsSentenceLevel?: boolean; wantsSsml?: boolean }
): CapabilityNegotiationResult {
  const unsupported: string[] = [];

  // 1. Language check
  if (config.language && !capabilities.supportedLanguages.includes(config.language)) {
    // Check if base language matches (e.g. 'vi' matches 'vi-VN')
    const baseLang = config.language.split('-')[0].toLowerCase();
    const hasBase = capabilities.supportedLanguages.some(l => l.toLowerCase().startsWith(baseLang));
    if (!hasBase) {
      unsupported.push(`Language "${config.language}" not directly supported`);
    }
  }

  // 2. Format check
  if (config.outputFormat && !capabilities.supportedFormats.includes(config.outputFormat)) {
    unsupported.push(`Output format "${config.outputFormat}" not supported`);
  }

  // 3. SSML check
  const useSsml = Boolean(requestContext?.wantsSsml && capabilities.supportsSsml);
  if (requestContext?.wantsSsml && !capabilities.supportsSsml) {
    unsupported.push('SSML prosody markup not supported; falling back to plain text');
  }

  // 4. Sentence-level synthesis check
  const useSentenceLevel = Boolean(
    (requestContext?.wantsSentenceLevel || config.enableSentenceLevel) &&
    capabilities.supportsSentenceLevelSynthesis
  );
  if (config.enableSentenceLevel && !capabilities.supportsSentenceLevelSynthesis) {
    unsupported.push('Sentence-level synthesis not supported; falling back to monolithic synthesis');
  }

  // 5. Pitch check
  const adjustedPitch = Boolean(config.pitch !== undefined && config.pitch !== 0 && capabilities.supportsPitch);
  if (config.pitch !== undefined && config.pitch !== 0 && !capabilities.supportsPitch) {
    unsupported.push('Pitch adjustment not supported');
  }

  // 6. Speed check
  const adjustedSpeed = Boolean(config.speed !== undefined && config.speed !== 1.0 && capabilities.supportsSpeed);
  if (config.speed !== undefined && config.speed !== 1.0 && !capabilities.supportsSpeed) {
    unsupported.push('Speed adjustment not supported');
  }

  // 7. Style control check
  if (config.style && !capabilities.supportsStyleControl && !capabilities.supportsStyles) {
    unsupported.push(`Voice style "${config.style}" not supported`);
  }

  return {
    canSynthesize: true,
    useSsml,
    useSentenceLevel,
    adjustedSpeed,
    adjustedPitch,
    unsupportedFeatures: unsupported,
  };
}
