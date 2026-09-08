// src/core/deviceVault/deviceVaultError.ts
// BOWCON V4.0 — SECURE DEVICE CREDENTIAL VAULT & DURABLE TRUST PERSISTENCE RUNTIME (MS-1.3.25)
//
// Typed immutable error hierarchy for device vault operations.
// All error payloads are automatically sanitized against secret leakage.
import { scrubVaultSecrets } from './deviceVaultAudit.js';
export class DeviceVaultError extends Error {
    errorCode;
    details;
    timestamp;
    constructor(errorCode, message, details) {
        super(`[${errorCode}] ${message}`);
        this.name = 'DeviceVaultError';
        this.errorCode = errorCode;
        this.timestamp = Date.now();
        if (details) {
            this.details = Object.freeze(scrubVaultSecrets(details));
        }
        Object.setPrototypeOf(this, DeviceVaultError.prototype);
    }
}
/**
 * Factory helper for creating a DeviceVaultError.
 */
export function createDeviceVaultError(errorCode, message, details) {
    return new DeviceVaultError(errorCode, message, details);
}
/**
 * Type guard for DeviceVaultError.
 */
export function isDeviceVaultError(err) {
    return (err instanceof DeviceVaultError ||
        (typeof err === 'object' &&
            err !== null &&
            err.name === 'DeviceVaultError' &&
            typeof err.errorCode === 'string'));
}
