export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';
export interface CircuitBreakerOptions {
    failureThreshold?: number;
    cooldownPeriodMs?: number;
    halfOpenMaxTrials?: number;
    maxConcurrentCalls?: number;
}
export declare class CircuitBreaker {
    private state;
    private failureCount;
    private successCount;
    private lastFailureTime;
    private inFlightCalls;
    private failureThreshold;
    private cooldownPeriodMs;
    private halfOpenMaxTrials;
    private maxConcurrentCalls;
    constructor(options?: CircuitBreakerOptions);
    getState(): CircuitState;
    canExecute(): boolean;
    execute<T>(action: () => Promise<T>, fallback?: () => Promise<T>): Promise<T>;
    recordSuccess(): void;
    recordFailure(): void;
    reset(): void;
}
export declare const globalCircuitBreaker: CircuitBreaker;
