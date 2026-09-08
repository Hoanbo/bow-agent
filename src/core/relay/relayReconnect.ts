// src/core/relay/relayReconnect.ts
// BOWCON V4.0 — SECURE ALWAYS-ON BRAIN RELAY & REMOTE SESSION RUNTIME (MS-1.3.27)
//
// Bounded, state-aware reconnection scheduler and invariant enforcement.
//
// INVARIANTS:
// - RECONNECT != RE-EXECUTE
// - Always-on != infinite loop
// - Retry behavior is strictly bounded and state-aware.
// - Reconnection ONLY restores transport communication, NEVER replays or re-executes tasks.

export interface ReconnectPolicy {
  readonly maxAttempts: number;
  readonly initialDelayMs: number;
  readonly maxDelayMs: number;
  readonly backoffMultiplier: number;
}

export const DEFAULT_RECONNECT_POLICY: ReconnectPolicy = Object.freeze({
  maxAttempts: 5,
  initialDelayMs: 500,
  maxDelayMs: 15000,
  backoffMultiplier: 2,
});

export class RelayReconnectError extends Error {
  constructor(message: string) {
    super(`RELAY_RECONNECT_ERROR: ${message}`);
    this.name = 'RelayReconnectError';
  }
}

export class RelayReconnectScheduler {
  private readonly attempts = new Map<string, number>();
  private readonly policy: ReconnectPolicy;

  constructor(policy?: Partial<ReconnectPolicy>) {
    this.policy = Object.freeze({
      ...DEFAULT_RECONNECT_POLICY,
      ...policy,
    });
  }

  /**
   * Calculates the next backoff delay for a session needing reconnection.
   */
  public scheduleNextAttempt(sessionId: string): {
    attempt: number;
    delayMs: number;
    allowed: boolean;
  } {
    const current = (this.attempts.get(sessionId) ?? 0) + 1;
    this.attempts.set(sessionId, current);

    if (current > this.policy.maxAttempts) {
      return {
        attempt: current,
        delayMs: -1,
        allowed: false,
      };
    }

    const rawDelay =
      this.policy.initialDelayMs * Math.pow(this.policy.backoffMultiplier, current - 1);
    const delayMs = Math.min(rawDelay, this.policy.maxDelayMs);

    return {
      attempt: current,
      delayMs,
      allowed: true,
    };
  }

  public recordSuccess(sessionId: string): void {
    this.attempts.delete(sessionId);
  }

  public getAttemptCount(sessionId: string): number {
    return this.attempts.get(sessionId) ?? 0;
  }

  public isExhausted(sessionId: string): boolean {
    return (this.attempts.get(sessionId) ?? 0) >= this.policy.maxAttempts;
  }

  public reset(sessionId: string): void {
    this.attempts.delete(sessionId);
  }

  public clear(): void {
    this.attempts.clear();
  }

  /**
   * Enforces the cardinal invariant: Reconnecting transport NEVER automatically re-executes tasks.
   */
  public static assertReconnectDoesNotReExecute(shouldReExecute: boolean): void {
    if (shouldReExecute) {
      throw new RelayReconnectError(
        'INVARIANT_VIOLATION: RECONNECT != RE-EXECUTE. Interrupted tasks MUST NOT automatically rerun upon reconnection.'
      );
    }
  }
}
