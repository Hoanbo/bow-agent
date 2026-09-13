import { AgentTraceProvenanceReferences, TenantId, TaskId } from './agentTraceTypes.js';
export interface SpanGateOptions {
    readonly isUserStopActive?: () => boolean;
    readonly getUserStopReason?: () => string | null;
}
export declare class AgentExecutionSpanGate {
    private readonly _isUserStopActive;
    private readonly _getUserStopReason;
    constructor(options?: SpanGateOptions);
    /**
     * Internal helper to assert USER_STOP supremacy synchronously at a checkpoint
     */
    private assertUserStop;
    /**
     * Validate string against injection, path traversal, prototype pollution, and null bytes
     */
    validateIdentifier(value: string, fieldName: string): void;
    /**
     * Validate generic object payload against prototype pollution and size limits
     */
    validatePayload(payload: unknown, depth?: number): void;
    /**
     * Checkpoint 1: Trace Creation
     */
    assertCheckpoint1_TraceCreation(tenantId: TenantId, taskId: TaskId, taskVersion: number): void;
    /**
     * Checkpoint 2: Span Collection
     */
    assertCheckpoint2_SpanCollection(expectedTenantId: TenantId, spanTenantId: TenantId, expectedTaskId: TaskId, spanTaskId: TaskId, expectedTaskVersion: number, spanTaskVersion: number): void;
    /**
     * Checkpoint 3: Telemetry Emission
     */
    assertCheckpoint3_TelemetryEmission(expectedTenantId: TenantId, eventTenantId: TenantId, expectedTaskId: TaskId, eventTaskId: TaskId, payload: unknown): void;
    /**
     * Checkpoint 4: SLO Measurement
     */
    assertCheckpoint4_SLOMeasurement(tenantId: TenantId, taskId: TaskId): void;
    /**
     * Checkpoint 5: Span Sealing
     */
    assertCheckpoint5_SpanSealing(tenantId: TenantId, taskId: TaskId, spanId: string): void;
    /**
     * Checkpoint 6: Trace Sealing
     */
    assertCheckpoint6_TraceSealing(tenantId: TenantId, taskId: TaskId, provenanceReferences: AgentTraceProvenanceReferences): void;
    /**
     * Checkpoint 7: Export / Result Generation
     */
    assertCheckpoint7_Export(tenantId: TenantId, taskId: TaskId): void;
}
