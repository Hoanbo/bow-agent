import { AgentExecutionSpan, AgentLifecycleStage, AgentSpanStatus, AgentTraceProvenanceReferences, ExecutionId, ParentSpanId, SpanId, StepId, TaskId, TenantId, TraceId } from './agentTraceTypes.js';
import { AgentExecutionSpanGate } from './agentExecutionSpanGate.js';
export interface StartSpanInput {
    readonly stage: AgentLifecycleStage;
    readonly parentSpanId?: ParentSpanId;
    readonly stepId?: StepId | null;
    readonly executionId?: ExecutionId | null;
    readonly customSpanId?: SpanId;
    readonly attributes?: Record<string, unknown>;
    readonly provenanceReferences?: AgentTraceProvenanceReferences;
    readonly startTimeIso?: string;
}
export interface EndSpanInput {
    readonly spanId: SpanId;
    readonly status: AgentSpanStatus;
    readonly endTimeIso?: string;
    readonly attributes?: Record<string, unknown>;
    readonly provenanceReferences?: AgentTraceProvenanceReferences;
    readonly error?: {
        readonly name: string;
        readonly message: string;
    } | null;
}
export declare class AgentTraceCollector {
    private readonly _tenantId;
    private readonly _taskId;
    private readonly _taskVersion;
    private readonly _traceId;
    private readonly _gate;
    private readonly _spans;
    private readonly _spanOrder;
    private _aggregatedProvenance;
    constructor(tenantId: TenantId, taskId: TaskId, taskVersion: number, traceId: TraceId, gate: AgentExecutionSpanGate);
    /**
     * Deterministic Span ID derivation
     */
    deriveSpanId(stage: AgentLifecycleStage, stepId?: StepId | null, executionId?: ExecutionId | null, sequence?: number): SpanId;
    /**
     * Start and register a new span
     */
    startSpan(input: StartSpanInput): AgentExecutionSpan;
    /**
     * Complete and seal an active span
     */
    endSpan(input: EndSpanInput): AgentExecutionSpan;
    private mergeProvenance;
    getSpan(spanId: SpanId): AgentExecutionSpan | undefined;
    getAllSpans(): readonly AgentExecutionSpan[];
    getAggregatedProvenance(): AgentTraceProvenanceReferences;
}
