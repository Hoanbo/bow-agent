// src/core/deviceVault/deviceVaultError.ts
// BOWCON V4.0 — SECURE DEVICE CREDENTIAL VAULT & DURABLE TRUST PERSISTENCE RUNTIME (MS-1.3.25)
//
// Typed immutable error hierarchy for device vault operations.
// All error payloads are automatically sanitized against secret leakage.

import type { DeviceVaultErrorCode } from './deviceVaultTypes.js';
import { scrubVaultSecrets } from './deviceVaultAudit.js';

export class DeviceVaultError extends Error {
  public readonly errorCode: DeviceVaultErrorCode;
  public readonly details?: Readonly<Record<string, unknown>>;
  public readonly timestamp: number;

  constructor(
    errorCode: DeviceVaultErrorCode,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(`[${errorCode}] ${message}`);
    this.name = 'DeviceVaultError';
    this.errorCode = errorCode;
    this.timestamp = Date.now();

    if (details) {
      this.details = Object.freeze(
        scrubVaultSecrets(details) as Record<string, unknown>
      );
    }

    Object.setPrototypeOf(this, DeviceVaultError.prototype);
  }
}

/**
 * Factory helper for creating a DeviceVaultError.
 */
export function createDeviceVaultError(
  errorCode: DeviceVaultErrorCode,
  message: string,
  details?: Record<string, unknown>
): DeviceVaultError {
  return new DeviceVaultError(errorCode, message, details);
}

/**
 * Type guard for DeviceVaultError.
 */
export function isDeviceVaultError(err: unknown): err is DeviceVaultError {
  return (
    err instanceof DeviceVaultError ||
    (typeof err === 'object' &&
      err !== null &&
      (err as any).name === 'DeviceVaultError' &&
      typeof (err as any).errorCode === 'string')
  );
}
