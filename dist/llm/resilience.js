// src/llm/resilience.ts
// BOWCON V4.0 — LLM RESILIENCE, CIRCUIT BREAKER & BACKPRESSURE GUARD
// Compliant with NIST AI RMF Reliability & Safety Functions
export class CircuitBreaker {
    state = 'CLOSED';
    failureCount = 0;
    successCount = 0;
    lastFailureTime = 0;
    inFlightCalls = 0;
    failureThreshold;
    cooldownPeriodMs;
    halfOpenMaxTrials;
    maxConcurrentCalls;
    constructor(options) {
        this.failureThreshold = options?.failureThreshold || 3;
        this.cooldownPeriodMs = options?.cooldownPeriodMs || 15_000; // 15s cooldown
        this.halfOpenMaxTrials = options?.halfOpenMaxTrials || 2;
        this.maxConcurrentCalls = options?.maxConcurrentCalls || 10;
    }
    getState() {
        if (this.state === 'OPEN') {
            const elapsed = Date.now() - this.lastFailureTime;
            if (elapsed >= this.cooldownPeriodMs) {
                this.state = 'HALF_OPEN';
                this.successCount = 0;
            }
        }
        return this.state;
    }
    canExecute() {
        const currentState = this.getState();
        if (currentState === 'OPEN')
            return false;
        if (this.inFlightCalls >= this.maxConcurrentCalls)
            return false;
        return true;
    }
    async execute(action, fallback) {
        if (!this.canExecute()) {
            if (fallback) {
                return fallback();
            }
            throw new Error(`CIRCUIT_BREAKER_OPEN: Service currently tripped into ${this.state} state or queue saturated.`);
        }
        this.inFlightCalls++;
        try {
            const result = await action();
            this.recordSuccess();
            return result;
        }
        catch (err) {
            this.recordFailure();
            if (fallback) {
                return fallback();
            }
            throw err;
        }
        finally {
            this.inFlightCalls = Math.max(0, this.inFlightCalls - 1);
        }
    }
    recordSuccess() {
        if (this.state === 'HALF_OPEN') {
            this.successCount++;
            if (this.successCount >= this.halfOpenMaxTrials) {
                this.state = 'CLOSED';
                this.failureCount = 0;
            }
        }
        else if (this.state === 'CLOSED') {
            this.failureCount = 0;
        }
    }
    recordFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        if (this.state === 'HALF_OPEN' || this.failureCount >= this.failureThreshold) {
            this.state = 'OPEN';
        }
    }
    reset() {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        this.inFlightCalls = 0;
    }
}
export const globalCircuitBreaker = new CircuitBreaker();
