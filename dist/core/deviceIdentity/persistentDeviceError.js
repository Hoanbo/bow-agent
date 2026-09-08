// src/core/deviceIdentity/persistentDeviceError.ts
// BOWCON V4.0 — PERSISTENT DEVICE IDENTITY & PASSWORDLESS RECOGNITION RUNTIME (MS-1.3.24)
//
// Authoritative error class and factories for persistent device identity and recognition.
// Invariant: Errors fail closed; sensitive secrets are NEVER exposed in error messages.
import { scrubDeviceSecrets } from './persistentDeviceAudit.js';
export class PersistentDeviceError extends Error {
    errorCode;
    deviceId;
    scopeString;
    details;
    timestamp;
    constructor(errorCode, message, options) {
        super(`[${errorCode}] ${message}`);
        this.name = 'PersistentDeviceError';
        this.errorCode = errorCode;
        this.deviceId = options?.deviceId;
        this.scopeString = options?.scopeString;
        this.details = options?.details ? Object.freeze(scrubDeviceSecrets(options.details)) : undefined;
        this.timestamp = Date.now();
        if (options?.cause && typeof Error.prototype.hasOwnProperty === 'function') {
            this.cause = options.cause;
        }
        Object.setPrototypeOf(this, PersistentDeviceError.prototype);
    }
}
/**
 * Creates a typed PersistentDeviceError with scrubbed details.
 */
export function createPersistentDeviceError(errorCode, message, options) {
    return new PersistentDeviceError(errorCode, message, options);
}
/**
 * Type guard for PersistentDeviceError.
 */
export function isPersistentDeviceError(value) {
    return value instanceof PersistentDeviceError;
}
