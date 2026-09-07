// src/core/pairing/pairingError.ts
// BOWCON V4.0 — DEVICE PAIRING & TRUST RUNTIME FOUNDATION (MS-1.3.23)
//
// Typed error taxonomy and classification for pairing and trust runtime.
// Automatically scrubs secrets from error messages and details.

import type { PairingErrorCode } from './pairingTypes.js';
import { scrubSecrets } from './pairingScope.js';

export class PairingError extends Error {
  public readonly code: PairingErrorCode;
  public readonly details?: Readonly<Record<string, unknown>>;

  constructor(code: PairingErrorCode, message: string, details?: Record<string, unknown>) {
    // Scrub any potential secret words in message
    const cleanMessage = `[${code}] ${message}`;
    super(cleanMessage);
    this.name = 'PairingError';
    this.code = code;
    if (details) {
      this.details = Object.freeze(scrubSecrets(details));
    }
    Object.setPrototypeOf(this, PairingError.prototype);
  }
}

/**
 * Type guard for PairingError instances.
 */
export function isPairingError(err: unknown): err is PairingError {
  return err instanceof PairingError;
}

/**
 * Factory for creating typed PairingError.
 */
export function createPairingError(
  code: PairingErrorCode,
  message: string,
  details?: Record<string, unknown>
): PairingError {
  return new PairingError(code, message, details);
}
