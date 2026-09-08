import { type InternetAuditLedger } from './internetAudit.js';
export interface InternetReconnectPolicy {
    readonly initialDelayMs: number;
    readonly maxDelayMs: number;
    readonly maxAttempts: number;
    /** Jitter factor in [0, 1]. Applied as a fraction of the computed delay. */
    readonly jitterFactor: number;
}
export declare const DEFAULT_RECONNECT_POLICY: Readonly<InternetReconnectPolicy>;
export interface InternetReconnectAttempt {
    readonly attempt: number;
    readonly scheduledDelayMs: number;
    readonly startedAt: number;
    readonly outcome: 'PENDING' | 'SUCCEEDED' | 'FAILED';
}
export declare class InternetReconnectScheduler {
    private _attempt;
    private readonly _attempts;
    private readonly _policy;
    private readonly _ledger;
    constructor(policy?: Partial<InternetReconnectPolicy>, ledger?: InternetAuditLedger);
    get attemptCount(): number;
    get attempts(): readonly InternetReconnectAttempt[];
    get isExhausted(): boolean;
    /**
     * Computes the delay for the next reconnect attempt using bounded
     * full-jitter exponential backoff.
     *
     * INVARIANT: Delay never exceeds maxDelayMs.
     */
    nextDelayMs(): number;
    /**
     * Records the start of a reconnect attempt.
     * Throws InternetEdgeError if the maximum attempt count is already reached.
     *
     * INVARIANT: Does not re-execute any agent task.
     */
    beginAttempt(): InternetReconnectAttempt;
    /**
     * Marks the last attempt as succeeded and resets the counter.
     * Does NOT reset session identity.
     */
    markSucceeded(): void;
    /**
     * Marks the last attempt as failed.
     */
    markFailed(): void;
    /**
     * Resets the scheduler for a new Edge lifecycle session.
     * INVARIANT: Does not re-execute any agent task.
     */
    reset(): void;
}
/**
 * Pure helper — waits the given number of ms (for use in tests with overridden clocks).
 * INVARIANT: This helper NEVER re-executes any agent task.
 */
export declare function internetReconnectWait(ms: number): Promise<void>;
