/**
 * Scrubs sensitive tokens, keys, and credentials from error strings.
 */
export declare function redactSecrets(message: string): string;
/**
 * Base error for all voice runtime operations.
 */
export declare class VoiceError extends Error {
    readonly code: string;
    readonly isVoiceError = true;
    constructor(message: string, code?: string);
}
/**
 * Thrown when voice configuration parameters fail validation.
 */
export declare class VoiceConfigurationError extends VoiceError {
    constructor(message: string);
}
/**
 * Thrown when a voice provider encounters an execution or network failure.
 */
export declare class VoiceProviderError extends VoiceError {
    constructor(message: string);
}
/**
 * Thrown when synthesis inputs or outputs fail serialization or decoding.
 */
export declare class VoiceSynthesisError extends VoiceError {
    constructor(message: string);
}
/**
 * Thrown when the requested provider is unconfigured, disabled, or missing credentials.
 */
export declare class VoiceProviderUnavailableError extends VoiceError {
    constructor(message: string);
}
/**
 * Thrown when a synthesis operation exceeds its configured deadline.
 */
export declare class VoiceTimeoutError extends VoiceError {
    constructor(message: string);
}
/**
 * Thrown when a voice request attempts path traversal, null-byte injection,
 * SSRF, or forbidden parameter manipulation.
 */
export declare class VoiceSecurityError extends VoiceError {
    constructor(message: string);
}
