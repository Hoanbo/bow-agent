// src/core/voice/voicePersonality.ts
// BOWCON V4.0 — VOICE PERSONALITY PROFILE & PRESETS (MILESTONE 1.3.6)
//
// Invariant (INV-8):
// Defines provider-independent voice personality profiles to control warmth, confidence,
// energy, expressiveness, pacing, and pauses across TTS providers.
// All values are strictly boundary-checked with prototype pollution protection.
import { VoiceConfigurationError, VoiceSecurityError } from './voiceErrors.js';
export const VOICE_PERSONALITY_PRESETS = {
    CALM_ASSISTANT: {
        name: 'CALM_ASSISTANT',
        warmth: 0.8,
        confidence: 0.85,
        energy: 0.5,
        expressiveness: 0.5,
        speakingRate: 1.0,
        pauseIntensity: 1.1,
        emphasisIntensity: 0.4,
    },
    SMART_ASSISTANT: {
        name: 'SMART_ASSISTANT',
        warmth: 0.6,
        confidence: 0.9,
        energy: 0.6,
        expressiveness: 0.6,
        speakingRate: 1.05,
        pauseIntensity: 1.0,
        emphasisIntensity: 0.5,
    },
    PROFESSIONAL: {
        name: 'PROFESSIONAL',
        warmth: 0.5,
        confidence: 0.95,
        energy: 0.5,
        expressiveness: 0.4,
        speakingRate: 1.0,
        pauseIntensity: 1.0,
        emphasisIntensity: 0.4,
    },
    /**
     * JARVIS_INSPIRED:
     * A functional personality configuration for a composed, intelligent, precise, calm assistant
     * with subtle authority, controlled emotion, and measured pauses.
     * NOTE: This is NOT an imitation of a copyrighted character, actor, or voice clone.
     */
    JARVIS_INSPIRED: {
        name: 'JARVIS_INSPIRED',
        warmth: 0.65,
        confidence: 0.98,
        energy: 0.55,
        expressiveness: 0.45,
        speakingRate: 0.98,
        pauseIntensity: 1.15,
        emphasisIntensity: 0.7,
    },
};
/**
 * Validates a candidate object against the VoicePersonality contract.
 */
export function validateVoicePersonality(input) {
    const errors = [];
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        return { valid: false, errors: ['VoicePersonality must be a non-null object'] };
    }
    const raw = input;
    // Prototype pollution defense
    if (Object.prototype.hasOwnProperty.call(raw, '__proto__') ||
        Object.prototype.hasOwnProperty.call(raw, 'constructor') ||
        Object.prototype.hasOwnProperty.call(raw, 'prototype')) {
        throw new VoiceSecurityError('Prototype pollution payload detected in VoicePersonality');
    }
    const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : 'custom';
    function checkRange(field, min, max, defaultVal) {
        const val = raw[field];
        if (val === undefined)
            return defaultVal;
        if (typeof val !== 'number' || isNaN(val) || val < min || val > max) {
            errors.push(`${field} must be a number between ${min} and ${max}, got: ${val}`);
            return defaultVal;
        }
        return val;
    }
    const warmth = checkRange('warmth', 0.0, 1.0, 0.5);
    const confidence = checkRange('confidence', 0.0, 1.0, 0.5);
    const energy = checkRange('energy', 0.0, 1.0, 0.5);
    const expressiveness = checkRange('expressiveness', 0.0, 1.0, 0.5);
    const speakingRate = checkRange('speakingRate', 0.5, 2.0, 1.0);
    const pauseIntensity = checkRange('pauseIntensity', 0.5, 2.0, 1.0);
    const emphasisIntensity = checkRange('emphasisIntensity', 0.0, 1.0, 0.5);
    if (errors.length > 0) {
        return { valid: false, errors };
    }
    return {
        valid: true,
        personality: {
            name,
            warmth,
            confidence,
            energy,
            expressiveness,
            speakingRate,
            pauseIntensity,
            emphasisIntensity,
        },
    };
}
/**
 * Resolves a personality model from a preset name or custom object.
 */
export function resolveVoicePersonality(input) {
    if (!input) {
        return VOICE_PERSONALITY_PRESETS.CALM_ASSISTANT;
    }
    if (typeof input === 'string') {
        const upper = input.toUpperCase().trim();
        if (VOICE_PERSONALITY_PRESETS[upper]) {
            return { ...VOICE_PERSONALITY_PRESETS[upper] };
        }
        throw new VoiceConfigurationError(`Unknown voice personality preset: "${input}". Available: ${Object.keys(VOICE_PERSONALITY_PRESETS).join(', ')}`);
    }
    const validated = validateVoicePersonality(input);
    if (!validated.valid || !validated.personality) {
        throw new VoiceConfigurationError(`Invalid VoicePersonality: ${validated.errors?.join('; ')}`);
    }
    return validated.personality;
}
