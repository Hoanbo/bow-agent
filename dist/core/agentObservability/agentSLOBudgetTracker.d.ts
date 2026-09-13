import { AgentSLOSummary, TaskId, TenantId } from './agentTraceTypes.js';
export declare class AgentSLOBudgetTracker {
    private readonly _tenantId;
    private readonly _taskId;
    private readonly _taskVersion;
    private readonly _startTimeMs;
    private _totalElapsedMs;
    private _cognitionLatencyMs;
    private _toolLatencyMs;
    private _verificationLatencyMs;
    private _commitLatencyMs;
    private _memoryLatencyMs;
    private _iterationCount;
    private _stepCount;
    private _retryCount;
    private _denialCount;
    constructor(tenantId: TenantId, taskId: TaskId, taskVersion: number, startTimeMs?: number);
    recordCognitionLatency(durationMs: number): void;
    recordToolLatency(durationMs: number): void;
    recordVerificationLatency(durationMs: number): void;
    recordCommitLatency(durationMs: number): void;
    recordMemoryLatency(durationMs: number): void;
    incrementIteration(): void;
    incrementStep(): void;
    incrementRetry(): void;
    incrementDenial(): void;
    /**
     * Produce a deeply immutable summary of SLO budget metrics and ceiling checks
     */
    getSummary(nowMs?: number): AgentSLOSummary;
}
