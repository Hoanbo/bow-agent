// src/llm/resilience.ts
// BOWCON V4.0 — LLM RESILIENCE, CIRCUIT BREAKER & BACKPRESSURE GUARD
// Compliant with NIST AI RMF Reliability & Safety Functions

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  cooldownPeriodMs?: number;
  halfOpenMaxTrials?: number;
  maxConcurrentCalls?: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private inFlightCalls = 0;

  private failureThreshold: number;
  private cooldownPeriodMs: number;
  private halfOpenMaxTrials: number;
  private maxConcurrentCalls: number;

  constructor(options?: CircuitBreakerOptions) {
    this.failureThreshold = options?.failureThreshold || 3;
    this.cooldownPeriodMs = options?.cooldownPeriodMs || 15_000; // 15s cooldown
    this.halfOpenMaxTrials = options?.halfOpenMaxTrials || 2;
    this.maxConcurrentCalls = options?.maxConcurrentCalls || 10;
  }

  public getState(): CircuitState {
    if (this.state === 'OPEN') {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.cooldownPeriodMs) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      }
    }
    return this.state;
  }

  public canExecute(): boolean {
    const currentState = this.getState();
    if (currentState === 'OPEN') return false;
    if (this.inFlightCalls >= this.maxConcurrentCalls) return false;
    return true;
  }

  public async execute<T>(action: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
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
    } catch (err) {
      this.recordFailure();
      if (fallback) {
        return fallback();
      }
      throw err;
    } finally {
      this.inFlightCalls = Math.max(0, this.inFlightCalls - 1);
    }
  }

  public recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.halfOpenMaxTrials) {
        this.state = 'CLOSED';
        this.failureCount = 0;
      }
    } else if (this.state === 'CLOSED') {
      this.failureCount = 0;
    }
  }

  public recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN' || this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  public reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.inFlightCalls = 0;
  }
}

export const globalCircuitBreaker = new CircuitBreaker();

