// src/core/voice/voiceConfig.ts
// BOWCON V4.0 — STRONGLY TYPED VOICE CONFIGURATION & REQUEST MODEL (MILESTONE 1.3.5)
import path from 'node:path';
import { VoiceSecurityError } from './voiceErrors.js';
import { validateVoicePersonality, VOICE_PERSONALITY_PRESETS } from './voicePersonality.js';
export const SUPPORTED_AUDIO_FORMATS = [
    'audio/mpeg',
    'audio/wav',
    'audio/pcm',
];
export const DEFAULT_VOICE_TIMEOUT_MS = 10_000;
export const DEFAULT_MAX_TEXT_LENGTH = 5_000;
export const MAX_ALLOWED_TEXT_LENGTH = 50_000;
export const MIN_ALLOWED_TEXT_LENGTH = 1;
/**
 * Windows reserved device names pattern.
 */
const WINDOWS_RESERVED_NAMES = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$/i;
/**
 * Validates a BCP-47 language tag pattern (e.g. "vi-VN", "en-US", "ja-JP", "vi", "en").
 */
const BCP47_PATTERN = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/i;
/**
 * Runtime schema validator for VoiceConfig with prototype pollution and path traversal protection.
 */
export function validateVoiceConfig(config) {
    const errors = [];
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
        return { valid: false, errors: ['VoiceConfig must be a non-null object'] };
    }
    // 1. Prototype pollution defense
    const raw = config;
    if (Object.prototype.hasOwnProperty.call(raw, '__proto__') ||
        Object.prototype.hasOwnProperty.call(raw, 'constructor') ||
        Object.prototype.hasOwnProperty.call(raw, 'prototype')) {
        throw new VoiceSecurityError('Prototype pollution payload detected in VoiceConfig');
    }
    const clean = {};
    // enabled
    if (raw.enabled !== undefined) {
        if (typeof raw.enabled !== 'boolean') {
            errors.push('enabled must be a boolean');
        }
        else {
            clean.enabled = raw.enabled;
        }
    }
    // provider
    if (raw.provider !== undefined) {
        if (typeof raw.provider !== 'string' || !raw.provider.trim()) {
            errors.push('provider must be a non-empty string');
        }
        else {
            clean.provider = raw.provider.trim();
        }
    }
    // voiceId
    if (raw.voiceId !== undefined) {
        if (typeof raw.voiceId !== 'string' || !raw.voiceId.trim()) {
            errors.push('voiceId must be a non-empty string');
        }
        else {
            clean.voiceId = raw.voiceId.trim();
        }
    }
    // language
    if (raw.language !== undefined) {
        if (typeof raw.language !== 'string' || !BCP47_PATTERN.test(raw.language.trim())) {
            errors.push(`language must be a valid BCP-47 code (e.g. vi-VN, en-US), got: "${raw.language}"`);
        }
        else {
            clean.language = raw.language.trim();
        }
    }
    // speed
    if (raw.speed !== undefined) {
        if (typeof raw.speed !== 'number' || isNaN(raw.speed) || raw.speed < 0.25 || raw.speed > 4.0) {
            errors.push(`speed must be a number between 0.25 and 4.0, got: ${raw.speed}`);
        }
        else {
            clean.speed = raw.speed;
        }
    }
    // pitch
    if (raw.pitch !== undefined) {
        if (typeof raw.pitch !== 'number' || isNaN(raw.pitch) || raw.pitch < -20 || raw.pitch > 20) {
            errors.push(`pitch must be a number between -20 and 20, got: ${raw.pitch}`);
        }
        else {
            clean.pitch = raw.pitch;
        }
    }
    // volume
    if (raw.volume !== undefined) {
        if (typeof raw.volume !== 'number' || isNaN(raw.volume) || raw.volume < 0 || raw.volume > 100) {
            errors.push(`volume must be a number between 0 and 100, got: ${raw.volume}`);
        }
        else {
            clean.volume = raw.volume;
        }
    }
    // outputFormat
    if (raw.outputFormat !== undefined) {
        if (!SUPPORTED_AUDIO_FORMATS.includes(raw.outputFormat)) {
            errors.push(`outputFormat must be one of: ${SUPPORTED_AUDIO_FORMATS.join(', ')}, got: "${raw.outputFormat}"`);
        }
        else {
            clean.outputFormat = raw.outputFormat;
        }
    }
    // sampleRate
    if (raw.sampleRate !== undefined) {
        const validRates = [8000, 16000, 22050, 24000, 32000, 44100, 48000];
        if (typeof raw.sampleRate !== 'number' || !validRates.includes(raw.sampleRate)) {
            errors.push(`sampleRate must be one of: ${validRates.join(', ')}, got: ${raw.sampleRate}`);
        }
        else {
            clean.sampleRate = raw.sampleRate;
        }
    }
    // stability (ElevenLabs)
    if (raw.stability !== undefined) {
        if (typeof raw.stability !== 'number' || isNaN(raw.stability) || raw.stability < 0.0 || raw.stability > 1.0) {
            errors.push(`stability must be a number between 0.0 and 1.0, got: ${raw.stability}`);
        }
        else {
            clean.stability = raw.stability;
        }
    }
    // similarity (ElevenLabs)
    if (raw.similarity !== undefined) {
        if (typeof raw.similarity !== 'number' || isNaN(raw.similarity) || raw.similarity < 0.0 || raw.similarity > 1.0) {
            errors.push(`similarity must be a number between 0.0 and 1.0, got: ${raw.similarity}`);
        }
        else {
            clean.similarity = raw.similarity;
        }
    }
    // style
    if (raw.style !== undefined) {
        if (typeof raw.style !== 'string') {
            errors.push('style must be a string');
        }
        else {
            clean.style = raw.style;
        }
    }
    // instructions
    if (raw.instructions !== undefined) {
        if (typeof raw.instructions !== 'string') {
            errors.push('instructions must be a string');
        }
        else {
            clean.instructions = raw.instructions;
        }
    }
    // timeoutMs
    if (raw.timeoutMs !== undefined) {
        if (typeof raw.timeoutMs !== 'number' || isNaN(raw.timeoutMs) || raw.timeoutMs < 100 || raw.timeoutMs > 60_000) {
            errors.push(`timeoutMs must be a number between 100 and 60000, got: ${raw.timeoutMs}`);
        }
        else {
            clean.timeoutMs = raw.timeoutMs;
        }
    }
    // maxTextLength
    if (raw.maxTextLength !== undefined) {
        if (typeof raw.maxTextLength !== 'number' ||
            isNaN(raw.maxTextLength) ||
            raw.maxTextLength < MIN_ALLOWED_TEXT_LENGTH ||
            raw.maxTextLength > MAX_ALLOWED_TEXT_LENGTH) {
            errors.push(`maxTextLength must be between ${MIN_ALLOWED_TEXT_LENGTH} and ${MAX_ALLOWED_TEXT_LENGTH}, got: ${raw.maxTextLength}`);
        }
        else {
            clean.maxTextLength = raw.maxTextLength;
        }
    }
    // outputDir: Security validation
    if (raw.outputDir !== undefined) {
        if (typeof raw.outputDir !== 'string' || !raw.outputDir.trim()) {
            errors.push('outputDir must be a non-empty string');
        }
        else {
            const dir = raw.outputDir.trim();
            // Null-byte check
            if (dir.includes('\0')) {
                throw new VoiceSecurityError('Null-byte injection detected in outputDir');
            }
            // Path traversal check
            if (dir.includes('..')) {
                throw new VoiceSecurityError('Path traversal token detected in outputDir');
            }
            // Windows reserved device names
            const parts = dir.split(/[\\/]/);
            for (const part of parts) {
                if (WINDOWS_RESERVED_NAMES.test(part)) {
                    throw new VoiceSecurityError(`Windows reserved device name detected in outputDir: "${part}"`);
                }
            }
            clean.outputDir = path.normalize(dir);
        }
    }
    // personalityPreset
    if (raw.personalityPreset !== undefined) {
        if (typeof raw.personalityPreset !== 'string' || !VOICE_PERSONALITY_PRESETS[raw.personalityPreset]) {
            errors.push(`personalityPreset must be one of: ${Object.keys(VOICE_PERSONALITY_PRESETS).join(', ')}, got: "${raw.personalityPreset}"`);
        }
        else {
            clean.personalityPreset = raw.personalityPreset;
        }
    }
    // personality
    if (raw.personality !== undefined) {
        if (typeof raw.personality === 'string') {
            const upper = raw.personality.toUpperCase().trim();
            if (VOICE_PERSONALITY_PRESETS[upper]) {
                clean.personality = upper;
            }
            else {
                errors.push(`personality preset string must be one of: ${Object.keys(VOICE_PERSONALITY_PRESETS).join(', ')}, got: "${raw.personality}"`);
            }
        }
        else {
            const pVal = validateVoicePersonality(raw.personality);
            if (!pVal.valid) {
                errors.push(...(pVal.errors || ['Invalid personality object']));
            }
            else {
                clean.personality = pVal.personality;
            }
        }
    }
    // enableProsody
    if (raw.enableProsody !== undefined) {
        if (typeof raw.enableProsody !== 'boolean') {
            errors.push('enableProsody must be a boolean');
        }
        else {
            clean.enableProsody = raw.enableProsody;
        }
    }
    // enableSentenceLevel
    if (raw.enableSentenceLevel !== undefined) {
        if (typeof raw.enableSentenceLevel !== 'boolean') {
            errors.push('enableSentenceLevel must be a boolean');
        }
        else {
            clean.enableSentenceLevel = raw.enableSentenceLevel;
        }
    }
    // fallbackProviders
    if (raw.fallbackProviders !== undefined) {
        if (!Array.isArray(raw.fallbackProviders) || raw.fallbackProviders.some(p => typeof p !== 'string' || !p.trim())) {
            errors.push('fallbackProviders must be an array of non-empty strings');
        }
        else {
            clean.fallbackProviders = raw.fallbackProviders.map(p => p.trim());
        }
    }
    if (errors.length > 0) {
        return { valid: false, errors };
    }
    return { valid: true, config: clean };
}
