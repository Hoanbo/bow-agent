// src/core/agentObservability/agentSLOBudgetTracker.ts
// BOWCON V4.0 — MS-1.4.11: AGENT TASK OBSERVABILITY & DISTRIBUTED TRACING
// Component 963: AgentSLOBudgetTracker
// Bounded Metric & Latency Budget Tracking (Report-Only, Non-Authoritative)

import {
  AgentSLOSummary,
  OBSERVABILITY_BOUNDS,
  TaskId,
  TenantId,
  deepFreeze,
} from './agentTraceTypes.js';

export class AgentSLOBudgetTracker {
  private readonly _tenantId: TenantId;
  private readonly _taskId: TaskId;
  private readonly _taskVersion: number;
  private readonly _startTimeMs: number;

  private _totalElapsedMs = 0;
  private _cognitionLatencyMs = 0;
  private _toolLatencyMs = 0;
  private _verificationLatencyMs = 0;
  private _commitLatencyMs = 0;
  private _memoryLatencyMs = 0;

  private _iterationCount = 0;
  private _stepCount = 0;
  private _retryCount = 0;
  private _denialCount = 0;

  constructor(tenantId: TenantId, taskId: TaskId, taskVersion: number, startTimeMs = Date.now()) {
    this._tenantId = tenantId;
    this._taskId = taskId;
    this._taskVersion = taskVersion;
    this._startTimeMs = startTimeMs;
  }

  public recordCognitionLatency(durationMs: number): void {
    if (durationMs > 0) this._cognitionLatencyMs += durationMs;
  }

  public recordToolLatency(durationMs: number): void {
    if (durationMs > 0) this._toolLatencyMs += durationMs;
  }

  public recordVerificationLatency(durationMs: number): void {
    if (durationMs > 0) this._verificationLatencyMs += durationMs;
  }

  public recordCommitLatency(durationMs: number): void {
    if (durationMs > 0) this._commitLatencyMs += durationMs;
  }

  public recordMemoryLatency(durationMs: number): void {
    if (durationMs > 0) this._memoryLatencyMs += durationMs;
  }

  public incrementIteration(): void {
    this._iterationCount++;
  }

  public incrementStep(): void {
    this._stepCount++;
  }

  public incrementRetry(): void {
    this._retryCount++;
  }

  public incrementDenial(): void {
    this._denialCount++;
  }

  /**
   * Produce a deeply immutable summary of SLO budget metrics and ceiling checks
   */
  public getSummary(nowMs = Date.now()): AgentSLOSummary {
    const elapsed = Math.max(0, nowMs - this._startTimeMs);
    this._totalElapsedMs = elapsed;

    const violations: string[] = [];

    if (elapsed > OBSERVABILITY_BOUNDS.MAX_TASK_EXECUTION_TIME_MS) {
      violations.push(
        `Execution time ${elapsed}ms exceeded ceiling ${OBSERVABILITY_BOUNDS.MAX_TASK_EXECUTION_TIME_MS}ms`
      );
    }
    if (this._iterationCount > OBSERVABILITY_BOUNDS.MAX_LOOP_ITERATIONS) {
      violations.push(
        `Iteration count ${this._iterationCount} exceeded ceiling ${OBSERVABILITY_BOUNDS.MAX_LOOP_ITERATIONS}`
      );
    }
    if (this._denialCount > OBSERVABILITY_BOUNDS.MAX_CONSECUTIVE_DENIALS) {
      violations.push(
        `Denial count ${this._denialCount} exceeded ceiling ${OBSERVABILITY_BOUNDS.MAX_CONSECUTIVE_DENIALS}`
      );
    }

    const summary: AgentSLOSummary = {
      tenantId: this._tenantId,
      taskId: this._taskId,
      taskVersion: this._taskVersion,
      totalElapsedMs: this._totalElapsedMs,
      cognitionLatencyMs: this._cognitionLatencyMs,
      toolLatencyMs: this._toolLatencyMs,
      verificationLatencyMs: this._verificationLatencyMs,
      commitLatencyMs: this._commitLatencyMs,
      memoryLatencyMs: this._memoryLatencyMs,
      iterationCount: this._iterationCount,
      stepCount: this._stepCount,
      retryCount: this._retryCount,
      denialCount: this._denialCount,
      isWithinCeilings: violations.length === 0,
      ceilingViolations: Object.freeze(violations),
    };

    return deepFreeze(summary);
  }
}
