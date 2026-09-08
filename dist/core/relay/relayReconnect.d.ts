export interface ReconnectPolicy {
    readonly maxAttempts: number;
    readonly initialDelayMs: number;
    readonly maxDelayMs: number;
    readonly backoffMultiplier: number;
}
export declare const DEFAULT_RECONNECT_POLICY: ReconnectPolicy;
export declare class RelayReconnectError extends Error {
    constructor(message: string);
}
export declare class RelayReconnectScheduler {
    private readonly attempts;
    private readonly policy;
    constructor(policy?: Partial<ReconnectPolicy>);
    /**
     * Calculates the next backoff delay for a session needing reconnection.
     */
    scheduleNextAttempt(sessionId: string): {
        attempt: number;
        delayMs: number;
        allowed: boolean;
    };
    recordSuccess(sessionId: string): void;
    getAttemptCount(sessionId: string): number;
    isExhausted(sessionId: string): boolean;
    reset(sessionId: string): void;
    clear(): void;
    /**
     * Enforces the cardinal invariant: Reconnecting transport NEVER automatically re-executes tasks.
     */
    static assertReconnectDoesNotReExecute(shouldReExecute: boolean): void;
}
