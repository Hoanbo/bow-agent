// src/core/voice/voiceErrors.ts
// BOWCON V4.0 — VOICE RUNTIME ERROR MODEL (MILESTONE 1.3.5)
//
// Invariants:
// 1. All errors inherit from VoiceError.
// 2. Secret isolation: API keys, tokens, and authorization credentials
//    are scrubbed automatically from all error messages and diagnostics.
/**
 * Scrubs sensitive tokens, keys, and credentials from error strings.
 */
export function redactSecrets(message) {
    if (!message || typeof message !== 'string')
        return '';
    return message
        // OpenAI and standard keys: sk-...
        .replace(/\bsk-[a-zA-Z0-9_-]{8,}\b/g, 'sk-[REDACTED]')
        // ElevenLabs / hex keys: 32+ hex chars
        .replace(/\b[a-fA-F0-9]{32,64}\b/g, '[REDACTED_HEX_KEY]')
        // Bearer / Basic tokens
        .replace(/(Bearer\s+)[a-zA-Z0-9_\-\.]+/gi, '$1[REDACTED_TOKEN]')
        .replace(/(Basic\s+)[a-zA-Z0-9_\-\.\+\/=]+/gi, '$1[REDACTED_CREDENTIALS]')
        // Query parameter keys: ?key=... or &api_key=...
        .replace(/([?&](?:api[_-]?key|token|secret|password)=)[^&]+/gi, '$1[REDACTED]');
}
/**
 * Base error for all voice runtime operations.
 */
export class VoiceError extends Error {
    code;
    isVoiceError = true;
    constructor(message, code = 'VOICE_ERROR') {
        super(redactSecrets(message));
        this.name = this.constructor.name;
        this.code = code;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
/**
 * Thrown when voice configuration parameters fail validation.
 */
export class VoiceConfigurationError extends VoiceError {
    constructor(message) {
        super(message, 'VOICE_CONFIGURATION_ERROR');
    }
}
/**
 * Thrown when a voice provider encounters an execution or network failure.
 */
export class VoiceProviderError extends VoiceError {
    constructor(message) {
        super(message, 'VOICE_PROVIDER_ERROR');
    }
}
/**
 * Thrown when synthesis inputs or outputs fail serialization or decoding.
 */
export class VoiceSynthesisError extends VoiceError {
    constructor(message) {
        super(message, 'VOICE_SYNTHESIS_ERROR');
    }
}
/**
 * Thrown when the requested provider is unconfigured, disabled, or missing credentials.
 */
export class VoiceProviderUnavailableError extends VoiceError {
    constructor(message) {
        super(message, 'VOICE_PROVIDER_UNAVAILABLE');
    }
}
/**
 * Thrown when a synthesis operation exceeds its configured deadline.
 */
export class VoiceTimeoutError extends VoiceError {
    constructor(message) {
        super(message, 'VOICE_TIMEOUT_ERROR');
    }
}
/**
 * Thrown when a voice request attempts path traversal, null-byte injection,
 * SSRF, or forbidden parameter manipulation.
 */
export class VoiceSecurityError extends VoiceError {
    constructor(message) {
        super(message, 'VOICE_SECURITY_ERROR');
    }
}
