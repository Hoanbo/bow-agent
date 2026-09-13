// src/core/agentObservability/agentObservabilityRuntime.ts
// BOWCON V4.0 — MS-1.4.11: AGENT TASK OBSERVABILITY & DISTRIBUTED TRACING
// Component 965: AgentObservabilityRuntime
// Master Public Façade for Governed Agent Observability & Distributed Tracing

import {
  AgentExecutionSpan,
  AgentLifecycleStage,
  AgentObservabilityResult,
  AgentObservabilityValidationError,
  AgentSLOSummary,
  AgentSpanStatus,
  AgentTelemetryEvent,
  AgentTelemetryEventType,
  AgentTraceEnvelope,
  AgentTraceProvenanceReferences,
  ExecutionId,
  ParentSpanId,
  SpanId,
  StepId,
  TaskId,
  TenantId,
  TraceId,
  deepFreeze,
} from './agentTraceTypes.js';
import { AgentExecutionSpanGate, SpanGateOptions } from './agentExecutionSpanGate.js';
import { AgentTraceCollector, EndSpanInput, StartSpanInput } from './agentTraceCollector.js';
import { AgentTaskTelemetryEmitter } from './agentTaskTelemetryEmitter.js';
import { AgentSLOBudgetTracker } from './agentSLOBudgetTracker.js';
import { globalAuditLedger } from '../auditLedger.js';

export interface StartTraceInput {
  readonly tenantId: TenantId;
  readonly taskId: TaskId;
  readonly taskVersion: number;
  readonly customTraceId?: TraceId;
  readonly startTimeIso?: string;
  readonly initialProvenance?: AgentTraceProvenanceReferences;
}

export class AgentObservabilityRuntime {
  private readonly _tenantId: TenantId;
  private readonly _taskId: TaskId;
  private readonly _taskVersion: number;
  private readonly _traceId: TraceId;
  private readonly _rootSpanId: SpanId;
  private readonly _startTimeIso: string;

  private readonly _gate: AgentExecutionSpanGate;
  private readonly _collector: AgentTraceCollector;
  private readonly _emitter: AgentTaskTelemetryEmitter;
  private readonly _sloTracker: AgentSLOBudgetTracker;

  private _status: 'ACTIVE' | 'SEALED' | 'ABORTED' = 'ACTIVE';
  private _endTimeIso: string | null = null;
  private _durationMs: number | null = null;
  private _sealedEnvelope: AgentTraceEnvelope | null = null;

  private constructor(input: StartTraceInput, gateOptions?: SpanGateOptions) {
    this._gate = new AgentExecutionSpanGate(gateOptions);

    // Enforce Checkpoint 1: Trace Creation
    this._gate.assertCheckpoint1_TraceCreation(input.tenantId, input.taskId, input.taskVersion);

    this._tenantId = input.tenantId;
    this._taskId = input.taskId;
    this._taskVersion = input.taskVersion;
    this._traceId = input.customTraceId || `trc_${input.tenantId}_${input.taskId}_${Date.now()}`;
    this._gate.validateIdentifier(this._traceId, 'traceId');

    this._startTimeIso = input.startTimeIso || new Date().toISOString();

    this._collector = new AgentTraceCollector(
      this._tenantId,
      this._taskId,
      this._taskVersion,
      this._traceId,
      this._gate
    );

    this._emitter = new AgentTaskTelemetryEmitter(
      this._tenantId,
      this._taskId,
      this._taskVersion,
      this._traceId,
      this._gate
    );

    this._sloTracker = new AgentSLOBudgetTracker(
      this._tenantId,
      this._taskId,
      this._taskVersion,
      Date.parse(this._startTimeIso) || Date.now()
    );

    // Create Root Task Span
    this._rootSpanId = `spn_${this._tenantId}_${this._taskId}_ROOT`;
    this._collector.startSpan({
      stage: 'TASK_INTAKE',
      customSpanId: this._rootSpanId,
      provenanceReferences: input.initialProvenance,
      startTimeIso: this._startTimeIso,
    });

    // Record Audit
    try {
      globalAuditLedger.record({
        timestamp: this._startTimeIso,
        actor: { userId: 'agent_observability_runtime', role: 'OBSERVABILITY', channel: 'INTERNAL_ORCHESTRATION' },
        domain: 'agent_observability',
        toolName: 'AgentObservabilityRuntime',
        classification: 'TRACE_START',
        argumentsHash: `trace_start_${this._traceId}_v${this._taskVersion}`,
        policyDecision: 'PERMIT',
        executionStatus: 'SUCCESS',
        resultHash: this._traceId,
      });
    } catch {
      // Fail closed audit attempt
    }
  }

  /**
   * Static factory method to start a new trace
   */
  public static startTrace(input: StartTraceInput, gateOptions?: SpanGateOptions): AgentObservabilityRuntime {
    return new AgentObservabilityRuntime(input, gateOptions);
  }

  public get traceId(): TraceId {
    return this._traceId;
  }

  public get tenantId(): TenantId {
    return this._tenantId;
  }

  public get taskId(): TaskId {
    return this._taskId;
  }

  public get taskVersion(): number {
    return this._taskVersion;
  }

  public get rootSpanId(): SpanId {
    return this._rootSpanId;
  }

  public get status(): 'ACTIVE' | 'SEALED' | 'ABORTED' {
    return this._status;
  }

  /**
   * Start a new child execution span
   */
  public startSpan(input: {
    stage: AgentLifecycleStage;
    parentSpanId?: ParentSpanId;
    stepId?: StepId | null;
    executionId?: ExecutionId | null;
    attributes?: Record<string, unknown>;
    provenanceReferences?: AgentTraceProvenanceReferences;
  }): AgentExecutionSpan {
    if (this._status !== 'ACTIVE') {
      throw new AgentObservabilityValidationError(
        `Cannot start span in trace [${this._traceId}]: trace is already ${this._status}`
      );
    }
    const parent = input.parentSpanId === undefined ? this._rootSpanId : input.parentSpanId;
    return this._collector.startSpan({
      ...input,
      parentSpanId: parent,
    });
  }

  /**
   * End and seal an execution span
   */
  public endSpan(input: {
    spanId: SpanId;
    status: AgentSpanStatus;
    attributes?: Record<string, unknown>;
    provenanceReferences?: AgentTraceProvenanceReferences;
    error?: { readonly name: string; readonly message: string } | null;
  }): AgentExecutionSpan {
    return this._collector.endSpan(input);
  }

  /**
   * Record a lifecycle telemetry event
   */
  public recordTelemetry(
    eventType: AgentTelemetryEventType,
    payload: Record<string, unknown> = {},
    spanId?: SpanId | null
  ): AgentTelemetryEvent {
    if (this._status !== 'ACTIVE') {
      throw new AgentObservabilityValidationError(
        `Cannot emit telemetry in trace [${this._traceId}]: trace is already ${this._status}`
      );
    }
    return this._emitter.emitEvent(eventType, payload, spanId);
  }

  /**
   * Record SLO latency or counter increments
   */
  public recordCognitionLatency(durationMs: number): void {
    this._gate.assertCheckpoint4_SLOMeasurement(this._tenantId, this._taskId);
    this._sloTracker.recordCognitionLatency(durationMs);
  }

  public recordToolLatency(durationMs: number): void {
    this._gate.assertCheckpoint4_SLOMeasurement(this._tenantId, this._taskId);
    this._sloTracker.recordToolLatency(durationMs);
  }

  public recordVerificationLatency(durationMs: number): void {
    this._gate.assertCheckpoint4_SLOMeasurement(this._tenantId, this._taskId);
    this._sloTracker.recordVerificationLatency(durationMs);
  }

  public recordCommitLatency(durationMs: number): void {
    this._gate.assertCheckpoint4_SLOMeasurement(this._tenantId, this._taskId);
    this._sloTracker.recordCommitLatency(durationMs);
  }

  public recordMemoryLatency(durationMs: number): void {
    this._gate.assertCheckpoint4_SLOMeasurement(this._tenantId, this._taskId);
    this._sloTracker.recordMemoryLatency(durationMs);
  }

  public incrementIteration(): void {
    this._gate.assertCheckpoint4_SLOMeasurement(this._tenantId, this._taskId);
    this._sloTracker.incrementIteration();
  }

  public incrementStep(): void {
    this._gate.assertCheckpoint4_SLOMeasurement(this._tenantId, this._taskId);
    this._sloTracker.incrementStep();
  }

  public incrementRetry(): void {
    this._gate.assertCheckpoint4_SLOMeasurement(this._tenantId, this._taskId);
    this._sloTracker.incrementRetry();
  }

  public incrementDenial(): void {
    this._gate.assertCheckpoint4_SLOMeasurement(this._tenantId, this._taskId);
    this._sloTracker.incrementDenial();
  }

  /**
   * Seal the trace and build the immutable AgentTraceEnvelope
   */
  public sealTrace(
    finalStatus: 'COMPLETED' | 'FAILED' | 'ABORTED' = 'COMPLETED',
    finalProvenance?: AgentTraceProvenanceReferences,
    nowIso = new Date().toISOString()
  ): AgentTraceEnvelope {
    if (this._sealedEnvelope) {
      return this._sealedEnvelope;
    }

    const mergedProv: AgentTraceProvenanceReferences = {
      ...this._collector.getAggregatedProvenance(),
      ...(finalProvenance || {}),
    };

    // Assert Checkpoint 6: Trace Sealing
    this._gate.assertCheckpoint6_TraceSealing(this._tenantId, this._taskId, mergedProv);

    // End root span if still active
    const rootSpan = this._collector.getSpan(this._rootSpanId);
    if (rootSpan && rootSpan.status === 'ACTIVE') {
      const rootSpanStatus: AgentSpanStatus =
        finalStatus === 'COMPLETED' ? 'COMPLETED' : finalStatus === 'ABORTED' ? 'ABORTED' : 'FAILED';
      this._collector.endSpan({
        spanId: this._rootSpanId,
        status: rootSpanStatus,
        endTimeIso: nowIso,
        provenanceReferences: mergedProv,
      });
    }

    this._status = finalStatus === 'ABORTED' ? 'ABORTED' : 'SEALED';
    this._endTimeIso = nowIso;
    const startMs = Date.parse(this._startTimeIso);
    const endMs = Date.parse(nowIso);
    this._durationMs = Number.isFinite(startMs) && Number.isFinite(endMs) && endMs >= startMs
      ? endMs - startMs
      : 0;

    const sloSummary = this._sloTracker.getSummary(endMs);

    const envelope: AgentTraceEnvelope = {
      traceId: this._traceId,
      rootSpanId: this._rootSpanId,
      tenantId: this._tenantId,
      taskId: this._taskId,
      taskVersion: this._taskVersion,
      startTimeIso: this._startTimeIso,
      endTimeIso: this._endTimeIso,
      durationMs: this._durationMs,
      status: this._status,
      spans: this._collector.getAllSpans(),
      events: this._emitter.getEvents(),
      sloSummary,
      provenanceReferences: Object.freeze(mergedProv),
      sealedAtIso: nowIso,
    };

    this._sealedEnvelope = deepFreeze(envelope);

    try {
      globalAuditLedger.record({
        timestamp: nowIso,
        actor: { userId: 'agent_observability_runtime', role: 'OBSERVABILITY', channel: 'INTERNAL_ORCHESTRATION' },
        domain: 'agent_observability',
        toolName: 'AgentObservabilityRuntime',
        classification: 'TRACE_SEALED',
        argumentsHash: `trace_sealed_${this._traceId}_${finalStatus}`,
        policyDecision: 'PERMIT',
        executionStatus: finalStatus === 'COMPLETED' ? 'SUCCESS' : 'BLOCKED',
        resultHash: this._traceId,
      });
    } catch {
      // Fail closed audit attempt
    }

    return this._sealedEnvelope;
  }

  /**
   * Export the immutable sealed envelope as an AgentObservabilityResult
   */
  public exportResult(): AgentObservabilityResult {
    // Assert Checkpoint 7: Export
    this._gate.assertCheckpoint7_Export(this._tenantId, this._taskId);

    const env = this._sealedEnvelope || this.sealTrace();
    const result: AgentObservabilityResult = {
      success: env.status === 'SEALED',
      traceId: this._traceId,
      envelope: env,
      error: env.status === 'ABORTED' ? { code: 'TRACE_ABORTED', message: 'Trace was aborted by user or security gate' } : null,
    };

    return deepFreeze(result);
  }
}
