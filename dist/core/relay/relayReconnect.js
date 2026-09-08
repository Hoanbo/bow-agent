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
export const DEFAULT_RECONNECT_POLICY = Object.freeze({
    maxAttempts: 5,
    initialDelayMs: 500,
    maxDelayMs: 15000,
    backoffMultiplier: 2,
});
export class RelayReconnectError extends Error {
    constructor(message) {
        super(`RELAY_RECONNECT_ERROR: ${message}`);
        this.name = 'RelayReconnectError';
    }
}
export class RelayReconnectScheduler {
    attempts = new Map();
    policy;
    constructor(policy) {
        this.policy = Object.freeze({
            ...DEFAULT_RECONNECT_POLICY,
            ...policy,
        });
    }
    /**
     * Calculates the next backoff delay for a session needing reconnection.
     */
    scheduleNextAttempt(sessionId) {
        const current = (this.attempts.get(sessionId) ?? 0) + 1;
        this.attempts.set(sessionId, current);
        if (current > this.policy.maxAttempts) {
            return {
                attempt: current,
                delayMs: -1,
                allowed: false,
            };
        }
        const rawDelay = this.policy.initialDelayMs * Math.pow(this.policy.backoffMultiplier, current - 1);
        const delayMs = Math.min(rawDelay, this.policy.maxDelayMs);
        return {
            attempt: current,
            delayMs,
            allowed: true,
        };
    }
    recordSuccess(sessionId) {
        this.attempts.delete(sessionId);
    }
    getAttemptCount(sessionId) {
        return this.attempts.get(sessionId) ?? 0;
    }
    isExhausted(sessionId) {
        return (this.attempts.get(sessionId) ?? 0) >= this.policy.maxAttempts;
    }
    reset(sessionId) {
        this.attempts.delete(sessionId);
    }
    clear() {
        this.attempts.clear();
    }
    /**
     * Enforces the cardinal invariant: Reconnecting transport NEVER automatically re-executes tasks.
     */
    static assertReconnectDoesNotReExecute(shouldReExecute) {
        if (shouldReExecute) {
            throw new RelayReconnectError('INVARIANT_VIOLATION: RECONNECT != RE-EXECUTE. Interrupted tasks MUST NOT automatically rerun upon reconnection.');
        }
    }
}
