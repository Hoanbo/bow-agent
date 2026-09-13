import { AgentTelemetryEvent, AgentTelemetryEventType, SpanId, TaskId, TenantId, TraceId } from './agentTraceTypes.js';
import { AgentExecutionSpanGate } from './agentExecutionSpanGate.js';
export declare class AgentTaskTelemetryEmitter {
    private readonly _tenantId;
    private readonly _taskId;
    private readonly _taskVersion;
    private readonly _traceId;
    private readonly _gate;
    private readonly _events;
    constructor(tenantId: TenantId, taskId: TaskId, taskVersion: number, traceId: TraceId, gate: AgentExecutionSpanGate);
    /**
     * Emit a sanitized telemetry event
     */
    emitEvent(eventType: AgentTelemetryEventType, payload?: Record<string, unknown>, spanId?: SpanId | null, nowIso?: string): AgentTelemetryEvent;
    /**
     * Get immutable snapshot of all emitted events
     */
    getEvents(): readonly AgentTelemetryEvent[];
}
