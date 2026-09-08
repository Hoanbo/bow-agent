// src/core/admission/admissionError.ts
// BOWCON V4.0 — ZERO-TRUST ALWAYS-ON BRAIN CONNECTIVITY & SECURE INTERNET ADMISSION RUNTIME (MS-1.3.26)
//
// Typed immutable error taxonomy for admission operations.
// Sanitizes all details payloads to prevent credential leakage.

import { scrubAdmissionSecrets } from './admissionAudit.js';

export type AdmissionErrorCode =
  | 'ADMISSION_UNAUTHORIZED'
  | 'ADMISSION_SCOPE_INVALID'
  | 'ADMISSION_SCOPE_MISMATCH'
  | 'ADMISSION_DEVICE_NOT_FOUND'
  | 'ADMISSION_DEVICE_REVOKED'
  | 'ADMISSION_KEY_REVOKED'
  | 'ADMISSION_TRUST_EXPIRED'
  | 'ADMISSION_TRUST_INSUFFICIENT'
  | 'ADMISSION_CHALLENGE_EXPIRED'
  | 'ADMISSION_PROOF_INVALID'
  | 'ADMISSION_PROOF_MISSING'
  | 'ADMISSION_REPLAY_DETECTED'
  | 'ADMISSION_SESSION_INVALID'
  | 'ADMISSION_SESSION_NOT_FOUND'
  | 'ADMISSION_SESSION_MISMATCH'
  | 'ADMISSION_CAPABILITY_FORBIDDEN'
  | 'ADMISSION_INVALID_ENDPOINT'
  | 'ADMISSION_INVALID_TRANSITION'
  | 'ADMISSION_SECRET_LEAKAGE_PREVENTED'
  | 'ADMISSION_ROAMING_RECONNECT_FAILED'
  | 'ADMISSION_INTERNAL_ERROR';

export const ALL_ADMISSION_ERROR_CODES: readonly AdmissionErrorCode[] = Object.freeze([
  'ADMISSION_UNAUTHORIZED',
  'ADMISSION_SCOPE_INVALID',
  'ADMISSION_SCOPE_MISMATCH',
  'ADMISSION_DEVICE_NOT_FOUND',
  'ADMISSION_DEVICE_REVOKED',
  'ADMISSION_KEY_REVOKED',
  'ADMISSION_TRUST_EXPIRED',
  'ADMISSION_TRUST_INSUFFICIENT',
  'ADMISSION_CHALLENGE_EXPIRED',
  'ADMISSION_PROOF_INVALID',
  'ADMISSION_PROOF_MISSING',
  'ADMISSION_REPLAY_DETECTED',
  'ADMISSION_SESSION_INVALID',
  'ADMISSION_SESSION_NOT_FOUND',
  'ADMISSION_SESSION_MISMATCH',
  'ADMISSION_CAPABILITY_FORBIDDEN',
  'ADMISSION_INVALID_ENDPOINT',
  'ADMISSION_INVALID_TRANSITION',
  'ADMISSION_SECRET_LEAKAGE_PREVENTED',
  'ADMISSION_ROAMING_RECONNECT_FAILED',
  'ADMISSION_INTERNAL_ERROR',
]);

export class AdmissionError extends Error {
  public readonly errorCode: AdmissionErrorCode;
  public readonly details?: Readonly<Record<string, unknown>>;
  public readonly timestamp: number;

  constructor(
    errorCode: AdmissionErrorCode,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(`[${errorCode}] ${message}`);
    this.name = 'AdmissionError';
    this.errorCode = errorCode;
    this.timestamp = Date.now();

    if (details) {
      this.details = Object.freeze(
        scrubAdmissionSecrets(details) as Record<string, unknown>
      );
    }

    Object.setPrototypeOf(this, AdmissionError.prototype);
  }
}

export function createAdmissionError(
  errorCode: AdmissionErrorCode,
  message: string,
  details?: Record<string, unknown>
): AdmissionError {
  return new AdmissionError(errorCode, message, details);
}

export function isAdmissionError(err: unknown): err is AdmissionError {
  return (
    err instanceof AdmissionError ||
    (typeof err === 'object' &&
      err !== null &&
      (err as any).name === 'AdmissionError' &&
      typeof (err as any).errorCode === 'string')
  );
}
