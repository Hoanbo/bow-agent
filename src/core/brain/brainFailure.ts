// src/core/brain/brainFailure.ts
// BOWCON V4.0 — MS-1.3.30: BRAIN ERROR HIERARCHY & SECRET SCRUBBING
//
// BrainError is the typed error class for all Brain Runtime failures.
// All error messages are scrubbed of secrets before logging.
//
// INVARIANT: Brain errors never expose credentials, tokens, or keys.
// INVARIANT: BrainError includes a machine-readable code for recovery decisions.

export type BrainErrorCode =
  | 'BRAIN_ILLEGAL_TRANSITION'
  | 'BRAIN_TASK_NOT_FOUND'
  | 'BRAIN_TASK_ALREADY_TERMINAL'
  | 'BRAIN_MAX_ITERATIONS_EXCEEDED'
  | 'BRAIN_MAX_RECOVERY_DEPTH_EXCEEDED'
  | 'BRAIN_TASK_DEADLINE_EXCEEDED'
  | 'BRAIN_TOOL_NOT_FOUND'
  | 'BRAIN_TOOL_EXECUTION_FAILED'
  | 'BRAIN_TOOL_TIMEOUT'
  | 'BRAIN_VERIFICATION_FAILED'
  | 'BRAIN_COMMIT_FAILED'
  | 'BRAIN_MODEL_TIMEOUT'
  | 'BRAIN_MODEL_UNAVAILABLE'
  | 'BRAIN_POLICY_DENIED'
  | 'BRAIN_CANCELLED'
  | 'BRAIN_STOPPED'
  | 'BRAIN_INTERNAL_ERROR';

const SECRET_PATTERNS: RegExp[] = [
  /(key|secret|token|password|bearer|auth|nonce|proof|pin)([=:\s]+)["']?([a-zA-Z0-9_\-\.+/]{4,})["']?/gi,
  /-----BEGIN [A-Z ]+-----[\s\S]*?-----END [A-Z ]+-----/g,
];

export function sanitizeBrainErrorMessage(raw: string): string {
  if (!raw) return '';
  let result = raw;
  result = result.replace(SECRET_PATTERNS[0], '$1$2[REDACTED]');
  result = result.replace(SECRET_PATTERNS[1], '[REDACTED_KEY_BLOCK]');
  return result;
}

export class BrainError extends Error {
  public readonly code: BrainErrorCode;
  public readonly timestamp: number;
  public readonly recoverable: boolean;

  constructor(code: BrainErrorCode, message: string, recoverable = false) {
    super(`[${code}] ${sanitizeBrainErrorMessage(message)}`);
    this.name = 'BrainError';
    this.code = code;
    this.timestamp = Date.now();
    this.recoverable = recoverable;
    Object.setPrototypeOf(this, BrainError.prototype);
  }
}
