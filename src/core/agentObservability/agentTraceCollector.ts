// src/core/agentObservability/agentTraceCollector.ts
// BOWCON V4.0 — MS-1.4.11: AGENT TASK OBSERVABILITY & DISTRIBUTED TRACING
// Component 961: AgentTraceCollector
// Deterministic Execution Span Collection & Parent-Child Hierarchy Enforcement

import {
  AgentExecutionSpan,
  AgentLifecycleStage,
  AgentObservabilityValidationError,
  AgentSpanStatus,
  AgentTraceProvenanceReferences,
  ExecutionId,
  OBSERVABILITY_BOUNDS,
  ParentSpanId,
  SpanId,
  StepId,
  TaskId,
  TenantId,
  TraceId,
  deepFreeze,
} from './agentTraceTypes.js';
import { AgentExecutionSpanGate } from './agentExecutionSpanGate.js';
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';

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
  readonly error?: { readonly name: string; readonly message: string } | null;
}

export class AgentTraceCollector {
  private readonly _tenantId: TenantId;
  private readonly _taskId: TaskId;
  private readonly _taskVersion: number;
  private readonly _traceId: TraceId;
  private readonly _gate: AgentExecutionSpanGate;

  private readonly _spans: Map<SpanId, AgentExecutionSpan> = new Map();
  private readonly _spanOrder: SpanId[] = [];
  private _aggregatedProvenance: AgentTraceProvenanceReferences = {};

  constructor(
    tenantId: TenantId,
    taskId: TaskId,
    taskVersion: number,
    traceId: TraceId,
    gate: AgentExecutionSpanGate
  ) {
    this._tenantId = tenantId;
    this._taskId = taskId;
    this._taskVersion = taskVersion;
    this._traceId = traceId;
    this._gate = gate;
  }

  /**
   * Deterministic Span ID derivation
   */
  public deriveSpanId(
    stage: AgentLifecycleStage,
    stepId?: StepId | null,
    executionId?: ExecutionId | null,
    sequence?: number
  ): SpanId {
    const cleanStep = stepId ? `_${stepId}` : '';
    const cleanExec = executionId ? `_${executionId}` : '';
    const seqPart = typeof sequence === 'number' ? `_sq${sequence}` : `_${this._spanOrder.length + 1}`;
    return `spn_${this._tenantId}_${this._taskId}_${stage}${cleanStep}${cleanExec}${seqPart}`;
  }

  /**
   * Start and register a new span
   */
  public startSpan(input: StartSpanInput): AgentExecutionSpan {
    // Assert Gate Checkpoint 2: Span Collection
    this._gate.assertCheckpoint2_SpanCollection(
      this._tenantId,
      this._tenantId,
      this._taskId,
      this._taskId,
      this._taskVersion,
      this._taskVersion
    );

    const spanId = input.customSpanId || this.deriveSpanId(input.stage, input.stepId, input.executionId);
    this._gate.validateIdentifier(spanId, 'spanId');

    // Duplicate span ID rejection
    if (this._spans.has(spanId)) {
      throw new AgentObservabilityValidationError(`Duplicate spanId rejected: ${spanId}`);
    }

    // Verify parent span if provided
    if (input.parentSpanId) {
      if (!this._spans.has(input.parentSpanId)) {
        throw new AgentObservabilityValidationError(
          `Parent span [${input.parentSpanId}] not found in trace [${this._traceId}]`
        );
      }
    }

    // Capacity bound check
    if (this._spans.size >= OBSERVABILITY_BOUNDS.MAX_SPANS_PER_TRACE) {
      throw new AgentObservabilityValidationError(
        `Span limit reached: maximum ${OBSERVABILITY_BOUNDS.MAX_SPANS_PER_TRACE} spans per trace`
      );
    }

    // Sanitize attributes
    const rawAttrs = input.attributes || {};
    this._gate.validatePayload(rawAttrs);
    const sanitizedAttrs = globalDiagnosisSanitizer.sanitize(rawAttrs) as Record<string, unknown>;

    const nowIso = input.startTimeIso || new Date().toISOString();

    const prov: AgentTraceProvenanceReferences = {
      ...(input.provenanceReferences || {}),
    };
    this.mergeProvenance(prov);

    const span: AgentExecutionSpan = {
      spanId,
      traceId: this._traceId,
      parentSpanId: input.parentSpanId ?? null,
      stage: input.stage,
      status: 'ACTIVE',
      tenantId: this._tenantId,
      taskId: this._taskId,
      taskVersion: this._taskVersion,
      stepId: input.stepId ?? null,
      executionId: input.executionId ?? null,
      startTimeIso: nowIso,
      endTimeIso: null,
      durationMs: null,
      attributes: sanitizedAttrs,
      provenanceReferences: Object.freeze(prov),
      error: null,
    };

    const frozen = deepFreeze(span);
    this._spans.set(spanId, frozen);
    this._spanOrder.push(spanId);

    return frozen;
  }

  /**
   * Complete and seal an active span
   */
  public endSpan(input: EndSpanInput): AgentExecutionSpan {
    this._gate.assertCheckpoint5_SpanSealing(this._tenantId, this._taskId, input.spanId);

    const existing = this._spans.get(input.spanId);
    if (!existing) {
      throw new AgentObservabilityValidationError(`Span [${input.spanId}] not found for ending`);
    }
    if (existing.status !== 'ACTIVE') {
      throw new AgentObservabilityValidationError(
        `Span [${input.spanId}] has already been finalized with status ${existing.status}`
      );
    }

    const endIso = input.endTimeIso || new Date().toISOString();
    const startMs = Date.parse(existing.startTimeIso);
    const endMs = Date.parse(endIso);
    const durationMs = Number.isFinite(startMs) && Number.isFinite(endMs) && endMs >= startMs
      ? endMs - startMs
      : 0;

    // Merge and sanitize additional attributes
    const additionalAttrs = input.attributes ? globalDiagnosisSanitizer.sanitize(input.attributes) as Record<string, unknown> : {};
    const mergedAttrs = {
      ...existing.attributes,
      ...additionalAttrs,
    };

    // Merge provenance
    const updatedProv: AgentTraceProvenanceReferences = {
      ...existing.provenanceReferences,
      ...(input.provenanceReferences || {}),
    };
    this.mergeProvenance(updatedProv);

    const completedSpan: AgentExecutionSpan = {
      ...existing,
      status: input.status,
      endTimeIso: endIso,
      durationMs,
      attributes: mergedAttrs,
      provenanceReferences: Object.freeze(updatedProv),
      error: input.error ?? null,
    };

    const frozen = deepFreeze(completedSpan);
    this._spans.set(input.spanId, frozen);

    return frozen;
  }

  private mergeProvenance(prov: AgentTraceProvenanceReferences): void {
    this._aggregatedProvenance = {
      verificationProvenanceHash: prov.verificationProvenanceHash || this._aggregatedProvenance.verificationProvenanceHash || null,
      commitProvenanceHash: prov.commitProvenanceHash || this._aggregatedProvenance.commitProvenanceHash || null,
      memoryProvenanceHash: prov.memoryProvenanceHash || this._aggregatedProvenance.memoryProvenanceHash || null,
      cycleProvenanceHash: prov.cycleProvenanceHash || this._aggregatedProvenance.cycleProvenanceHash || null,
    };
  }

  public getSpan(spanId: SpanId): AgentExecutionSpan | undefined {
    return this._spans.get(spanId);
  }

  public getAllSpans(): readonly AgentExecutionSpan[] {
    const list: AgentExecutionSpan[] = [];
    for (const id of this._spanOrder) {
      const s = this._spans.get(id);
      if (s) list.push(s);
    }
    return Object.freeze(list);
  }

  public getAggregatedProvenance(): AgentTraceProvenanceReferences {
    return Object.freeze({ ...this._aggregatedProvenance });
  }
}
