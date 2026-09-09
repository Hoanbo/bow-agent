// src/core/supervisor/supervisorFailure.ts
// BOWCON V4.0 — MS-1.3.35: REAL BOWCON SUPERVISORY AUTONOMOUS RECOVERY & HUMAN GOVERNANCE RUNTIME
//
// Failure taxonomy and typed SupervisorError with recursive secret scrubbing.
//
// INVARIANTS:
// FAILURE != BRAIN_DEATH
// USER_STOP > AUTONOMOUS_EXECUTION

export type SupervisorFailureCode =
  | 'RECOVERABLE'
  | 'DEGRADED'
  | 'AUTHORIZATION_REQUIRED'
  | 'POLICY_DENIED'
  | 'UNAVAILABLE'
  | 'TIMEOUT'
  | 'VERIFICATION_FAILED'
  | 'ROLLBACK_FAILED'
  | 'ESCALATED'
  | 'SAFE_STOP_TRIGGERED'
  | 'FATAL';

export class SupervisorError extends Error {
  public readonly code: SupervisorFailureCode;
  public readonly anomalyId?: string;
  public readonly target?: string;
  public readonly timestamp: number;
  public readonly details?: Record<string, any>;

  constructor(
    code: SupervisorFailureCode,
    message: string,
    anomalyId?: string,
    target?: string,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = 'SupervisorError';
    this.code = code;
    this.anomalyId = anomalyId;
    this.target = target;
    this.timestamp = Date.now();
    this.details = details ? SupervisorError.scrubDetails(details) : undefined;
  }

  get isRecoverable(): boolean {
    return this.code !== 'FATAL';
  }

  private static scrubDetails(obj: Record<string, any>): Record<string, any> {
    const scrubbed: Record<string, any> = {};
    const sensitiveKeys = ['secret', 'token', 'password', 'key', 'auth', 'signature', 'private', 'bearer'];
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
