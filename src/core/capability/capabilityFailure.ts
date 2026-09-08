// src/core/capability/capabilityFailure.ts
// BOWCON V4.0 — MS-1.3.34: REAL BOWCON CAPABILITY & ENVIRONMENT INTERACTION RUNTIME
//
// Failure taxonomy and error classes for capability execution and discovery.
//
// INVARIANTS:
// FAILURE != BRAIN_DEATH
// Recoverable failures must not crash or terminate the Brain.

export type CapabilityFailureCode =
  | 'RECOVERABLE'
  | 'DEGRADED'
  | 'AUTHORIZATION_REQUIRED'
  | 'POLICY_DENIED'
  | 'UNAVAILABLE'
  | 'TIMEOUT'
  | 'VERIFICATION_FAILED'
  | 'ROLLBACK_FAILED'
  | 'FATAL';

export class CapabilityError extends Error {
  public readonly code: CapabilityFailureCode;
  public readonly capabilityId?: string;
  public readonly target?: string;
  public readonly timestamp: number;
  public readonly details?: Record<string, any>;

  constructor(
    code: CapabilityFailureCode,
    message: string,
    capabilityId?: string,
    target?: string,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = 'CapabilityError';
    this.code = code;
    this.capabilityId = capabilityId;
    this.target = target;
    this.timestamp = Date.now();
    this.details = details ? CapabilityError.scrubDetails(details) : undefined;
  }

  get isRecoverable(): boolean {
    return this.code !== 'FATAL';
  }

  private static scrubDetails(obj: Record<string, any>): Record<string, any> {
    const scrubbed: Record<string, any> = {};
    const sensitiveKeys = ['secret', 'token', 'password', 'key', 'auth', 'signature', 'private'];
    for (const [k, v] of Object.entries(obj)) {
      if (sensitiveKeys.some(sk => k.toLowerCase().includes(sk))) {
        scrubbed[k] = '[REDACTED_SECRET]';
      } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        scrubbed[k] = this.scrubDetails(v);
      } else {
        scrubbed[k] = v;
      }
    }
    return scrubbed;
  }
}
