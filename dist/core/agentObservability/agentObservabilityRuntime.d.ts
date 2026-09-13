import { AgentExecutionSpan, AgentLifecycleStage, AgentObservabilityResult, AgentSpanStatus, AgentTelemetryEvent, AgentTelemetryEventType, AgentTraceEnvelope, AgentTraceProvenanceReferences, ExecutionId, ParentSpanId, SpanId, StepId, TaskId, TenantId, TraceId } from './agentTraceTypes.js';
import { SpanGateOptions } from './agentExecutionSpanGate.js';
export interface StartTraceInput {
    readonly tenantId: TenantId;
    readonly taskId: TaskId;
    readonly taskVersion: number;
    readonly customTraceId?: TraceId;
    readonly startTimeIso?: string;
    readonly initialProvenance?: AgentTraceProvenanceReferences;
}
export declare class AgentObservabilityRuntime {
    private readonly _tenantId;
    private readonly _taskId;
    private readonly _taskVersion;
    private readonly _traceId;
    private readonly _rootSpanId;
    private readonly _startTimeIso;
    private readonly _gate;
    private readonly _collector;
    private readonly _emitter;
    private readonly _sloTracker;
    private _status;
    private _endTimeIso;
    private _durationMs;
    private _sealedEnvelope;
    private constructor();
    /**
     * Static factory method to start a new trace
     */
    static startTrace(input: StartTraceInput, gateOptions?: SpanGateOptions): AgentObservabilityRuntime;
    get traceId(): TraceId;
    get tenantId(): TenantId;
    get taskId(): TaskId;
    get taskVersion(): number;
    get rootSpanId(): SpanId;
    get status(): 'ACTIVE' | 'SEALED' | 'ABORTED';
    /**
     * Start a new child execution span
     */
    startSpan(input: {
        stage: AgentLifecycleStage;
        parentSpanId?: ParentSpanId;
        stepId?: StepId | null;
        executionId?: ExecutionId | null;
        attributes?: Record<string, unknown>;
        provenanceReferences?: AgentTraceProvenanceReferences;
    }): AgentExecutionSpan;
    /**
     * End and seal an execution span
     */
    endSpan(input: {
        spanId: SpanId;
        status: AgentSpanStatus;
        attributes?: Record<string, unknown>;
        provenanceReferences?: AgentTraceProvenanceReferences;
        error?: {
            readonly name: string;
            readonly message: string;
        } | null;
    }): AgentExecutionSpan;
    /**
     * Record a lifecycle telemetry event
     */
    recordTelemetry(eventType: AgentTelemetryEventType, payload?: Record<string, unknown>, spanId?: SpanId | null): AgentTelemetryEvent;
    /**
     * Record SLO latency or counter increments
     */
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
     * Seal the trace and build the immutable AgentTraceEnvelope
     */
    sealTrace(finalStatus?: 'COMPLETED' | 'FAILED' | 'ABORTED', finalProvenance?: AgentTraceProvenanceReferences, nowIso?: string): AgentTraceEnvelope;
    /**
     * Export the immutable sealed envelope as an AgentObservabilityResult
     */
    exportResult(): AgentObservabilityResult;
}
