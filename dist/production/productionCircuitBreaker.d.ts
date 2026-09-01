import type { CircuitBreakerState } from '../monitoring/analyticsTypes.js';
export declare function getCircuitBreakerState(): CircuitBreakerState;
export declare function isCircuitOpen(): boolean;
export declare function recordExecutionSuccess(): void;
export declare function recordExecutionFailure(reason: string): void;
export declare function forceTripCircuit(reason?: string): void;
export declare function resetCircuitBreaker(): void;
export declare function getCircuitBreakerStats(): {
    state: CircuitBreakerState;
    consecutiveFailures: number;
    consecutiveSuccesses: number;
    openedAt: string | null;
    lastFailureReason: string | null;
};
/**
 * Hard Invariant: Critical business flows must NEVER be intercepted by the circuit breaker.
 */
export declare function isExemptFromCircuitBreaker(intent: string, route: string): boolean;
