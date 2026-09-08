// src/core/world-action/worldActionFailure.ts
// BOWCON V4.0 — MS-1.3.33: REAL BOWCON WORLD ACTION & GOVERNED EXECUTION RUNTIME
//
// Typed failure codes, error class, and context scrubbing for the governed execution subsystem.

export type WorldActionFailureCode =
  | 'PLANNING_FAILURE'
  | 'AUTHORIZATION_FAILURE'
  | 'POLICY_DENIAL'
  | 'TOOL_NOT_FOUND'
  | 'INVALID_TARGET'
  | 'EXECUTION_FAILURE'
  | 'TIMEOUT'
  | 'VERIFICATION_FAILURE'
  | 'COMMIT_FAILURE'
  | 'ROLLBACK_FAILURE'
  | 'SECURITY_VIOLATION'
  | 'IDEMPOTENCY_CONFLICT'
  | 'EMERGENCY_STOP_ACTIVE'
  | 'RESOURCE_LOCKED';

export class WorldActionError extends Error {
  public readonly code: WorldActionFailureCode;
  public readonly actionId?: string;
  public readonly target?: string;
  public readonly timestamp: number;
  public readonly details?: Record<string, any>;

  constructor(
    code: WorldActionFailureCode,
    message: string,
    actionId?: string,
    target?: string,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = 'WorldActionError';
    this.code = code;
    this.actionId = actionId;
    this.target = target;
    this.timestamp = Date.now();
    this.details = details ? WorldActionError.scrubDetails(details) : undefined;
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
