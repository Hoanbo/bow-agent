// src/core/agentObservability/agentSLOBudgetTracker.ts
// BOWCON V4.0 — MS-1.4.11: AGENT TASK OBSERVABILITY & DISTRIBUTED TRACING
// Component 963: AgentSLOBudgetTracker
// Bounded Metric & Latency Budget Tracking (Report-Only, Non-Authoritative)
import { OBSERVABILITY_BOUNDS, deepFreeze, } from './agentTraceTypes.js';
export class AgentSLOBudgetTracker {
    _tenantId;
    _taskId;
    _taskVersion;
    _startTimeMs;
    _totalElapsedMs = 0;
    _cognitionLatencyMs = 0;
    _toolLatencyMs = 0;
    _verificationLatencyMs = 0;
    _commitLatencyMs = 0;
    _memoryLatencyMs = 0;
    _iterationCount = 0;
    _stepCount = 0;
    _retryCount = 0;
    _denialCount = 0;
    constructor(tenantId, taskId, taskVersion, startTimeMs = Date.now()) {
        this._tenantId = tenantId;
        this._taskId = taskId;
        this._taskVersion = taskVersion;
        this._startTimeMs = startTimeMs;
    }
    recordCognitionLatency(durationMs) {
        if (durationMs > 0)
            this._cognitionLatencyMs += durationMs;
    }
    recordToolLatency(durationMs) {
        if (durationMs > 0)
            this._toolLatencyMs += durationMs;
    }
    recordVerificationLatency(durationMs) {
        if (durationMs > 0)
            this._verificationLatencyMs += durationMs;
    }
    recordCommitLatency(durationMs) {
        if (durationMs > 0)
            this._commitLatencyMs += durationMs;
    }
    recordMemoryLatency(durationMs) {
        if (durationMs > 0)
            this._memoryLatencyMs += durationMs;
    }
    incrementIteration() {
        this._iterationCount++;
    }
    incrementStep() {
        this._stepCount++;
    }
    incrementRetry() {
        this._retryCount++;
    }
    incrementDenial() {
        this._denialCount++;
    }
    /**
     * Produce a deeply immutable summary of SLO budget metrics and ceiling checks
     */
    getSummary(nowMs = Date.now()) {
        const elapsed = Math.max(0, nowMs - this._startTimeMs);
        this._totalElapsedMs = elapsed;
        const violations = [];
        if (elapsed > OBSERVABILITY_BOUNDS.MAX_TASK_EXECUTION_TIME_MS) {
            violations.push(`Execution time ${elapsed}ms exceeded ceiling ${OBSERVABILITY_BOUNDS.MAX_TASK_EXECUTION_TIME_MS}ms`);
        }
        if (this._iterationCount > OBSERVABILITY_BOUNDS.MAX_LOOP_ITERATIONS) {
            violations.push(`Iteration count ${this._iterationCount} exceeded ceiling ${OBSERVABILITY_BOUNDS.MAX_LOOP_ITERATIONS}`);
        }
        if (this._denialCount > OBSERVABILITY_BOUNDS.MAX_CONSECUTIVE_DENIALS) {
            violations.push(`Denial count ${this._denialCount} exceeded ceiling ${OBSERVABILITY_BOUNDS.MAX_CONSECUTIVE_DENIALS}`);
        }
        const summary = {
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
