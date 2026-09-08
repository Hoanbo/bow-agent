// src/core/internet/internetReconnect.ts
// BOWCON V4.0 — PRODUCTION SECURE INTERNET EDGE & TLS RELAY RUNTIME (MS-1.3.29)
//
// Exponential-backoff reconnect scheduler for the Internet Edge.
//
// INVARIANT: RECONNECT != RE-EXECUTE — reconnect NEVER retriggers task execution.
// INVARIANT: RECONNECT != SESSION_RECREATION — re-uses existing session when possible.
// INVARIANT: All backoff values are bounded (never unbounded growth).
import { INTERNET_RECONNECT_INITIAL_DELAY_MS, INTERNET_RECONNECT_MAX_DELAY_MS, INTERNET_RECONNECT_MAX_ATTEMPTS, } from './internetTypes.js';
import { appendInternetAuditEvent } from './internetAudit.js';
import { InternetEdgeError } from './internetFailure.js';
export const DEFAULT_RECONNECT_POLICY = Object.freeze({
    initialDelayMs: INTERNET_RECONNECT_INITIAL_DELAY_MS,
    maxDelayMs: INTERNET_RECONNECT_MAX_DELAY_MS,
    maxAttempts: INTERNET_RECONNECT_MAX_ATTEMPTS,
    jitterFactor: 0.2,
});
export class InternetReconnectScheduler {
    _attempt = 0;
    _attempts = [];
    _policy;
    _ledger;
    constructor(policy = {}, ledger) {
        this._policy = Object.freeze({ ...DEFAULT_RECONNECT_POLICY, ...policy });
        this._ledger = ledger ?? { events: [] };
    }
    get attemptCount() { return this._attempt; }
    get attempts() { return this._attempts; }
    get isExhausted() { return this._attempt >= this._policy.maxAttempts; }
    /**
     * Computes the delay for the next reconnect attempt using bounded
     * full-jitter exponential backoff.
     *
     * INVARIANT: Delay never exceeds maxDelayMs.
     */
    nextDelayMs() {
        const base = Math.min(this._policy.initialDelayMs * Math.pow(2, this._attempt), this._policy.maxDelayMs);
        const jitter = base * this._policy.jitterFactor * Math.random();
        return Math.floor(base + jitter);
    }
    /**
     * Records the start of a reconnect attempt.
     * Throws InternetEdgeError if the maximum attempt count is already reached.
     *
     * INVARIANT: Does not re-execute any agent task.
     */
    beginAttempt() {
        if (this.isExhausted) {
            appendInternetAuditEvent(this._ledger, {
                type: 'EDGE_RECONNECT_EXHAUSTED',
                attempt: this._attempt,
                timestamp: Date.now(),
            });
            throw new InternetEdgeError('INTERNET_RECONNECT_EXHAUSTED', `Reconnect attempts exhausted after ${this._attempt} attempts (max ${this._policy.maxAttempts}).`);
        }
        this._attempt++;
        const attempt = {
            attempt: this._attempt,
            scheduledDelayMs: this.nextDelayMs(),
            startedAt: Date.now(),
            outcome: 'PENDING',
        };
        this._attempts.push(attempt);
        appendInternetAuditEvent(this._ledger, {
            type: 'EDGE_RECONNECTING',
            attempt: this._attempt,
            delayMs: attempt.scheduledDelayMs,
            timestamp: Date.now(),
        });
        return attempt;
    }
    /**
     * Marks the last attempt as succeeded and resets the counter.
     * Does NOT reset session identity.
     */
    markSucceeded() {
        const last = this._attempts[this._attempts.length - 1];
        if (last) {
            last.outcome = 'SUCCEEDED';
        }
        this._attempt = 0; // reset on success
    }
    /**
     * Marks the last attempt as failed.
     */
    markFailed() {
        const last = this._attempts[this._attempts.length - 1];
        if (last) {
            last.outcome = 'FAILED';
        }
    }
    /**
     * Resets the scheduler for a new Edge lifecycle session.
     * INVARIANT: Does not re-execute any agent task.
     */
    reset() {
        this._attempt = 0;
        this._attempts.length = 0;
    }
}
/**
 * Pure helper — waits the given number of ms (for use in tests with overridden clocks).
 * INVARIANT: This helper NEVER re-executes any agent task.
 */
export async function internetReconnectWait(ms) {
    await new Promise((resolve) => setTimeout(resolve, ms));
}
