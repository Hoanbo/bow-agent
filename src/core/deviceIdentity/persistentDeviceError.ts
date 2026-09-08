// src/core/deviceIdentity/persistentDeviceError.ts
// BOWCON V4.0 — PERSISTENT DEVICE IDENTITY & PASSWORDLESS RECOGNITION RUNTIME (MS-1.3.24)
//
// Authoritative error class and factories for persistent device identity and recognition.
// Invariant: Errors fail closed; sensitive secrets are NEVER exposed in error messages.

import type { DeviceIdentityErrorCode } from './persistentDeviceTypes.js';
import { scrubDeviceSecrets } from './persistentDeviceAudit.js';

export interface PersistentDeviceErrorDetails {
  readonly deviceId?: string;
  readonly scopeString?: string;
  readonly details?: Record<string, unknown>;
  readonly cause?: unknown;
}

export class PersistentDeviceError extends Error {
  public readonly errorCode: DeviceIdentityErrorCode;
  public readonly deviceId?: string;
  public readonly scopeString?: string;
  public readonly details?: Readonly<Record<string, unknown>>;
  public readonly timestamp: number;

  constructor(
    errorCode: DeviceIdentityErrorCode,
    message: string,
    options?: PersistentDeviceErrorDetails,
  ) {
    super(`[${errorCode}] ${message}`);
    this.name = 'PersistentDeviceError';
    this.errorCode = errorCode;
    this.deviceId = options?.deviceId;
    this.scopeString = options?.scopeString;
    this.details = options?.details ? Object.freeze(scrubDeviceSecrets(options.details)) : undefined;
    this.timestamp = Date.now();

    if (options?.cause && typeof Error.prototype.hasOwnProperty === 'function') {
      (this as unknown as { cause: unknown }).cause = options.cause;
    }

    Object.setPrototypeOf(this, PersistentDeviceError.prototype);
  }
}

/**
 * Creates a typed PersistentDeviceError with scrubbed details.
 */
export function createPersistentDeviceError(
  errorCode: DeviceIdentityErrorCode,
  message: string,
  options?: PersistentDeviceErrorDetails,
): PersistentDeviceError {
  return new PersistentDeviceError(errorCode, message, options);
}

/**
 * Type guard for PersistentDeviceError.
 */
export function isPersistentDeviceError(value: unknown): value is PersistentDeviceError {
  return value instanceof PersistentDeviceError;
}
