// src/core/agentObservability/agentTraceTypes.ts
// BOWCON V4.0 — MS-1.4.11: AGENT TASK OBSERVABILITY & DISTRIBUTED TRACING
// Canonical Contracts, Taxonomies, Data Models & Error Hierarchy

export type TraceId = string;
export type SpanId = string;
export type ParentSpanId = string | null;
export type TenantId = string;
export type TaskId = string;
export type StepId = string;
export type ExecutionId = string;

/**
 * Canonical Lifecycle Stage Taxonomy across the Governed Agent Execution Plane
 */
export type AgentLifecycleStage =
  | 'TASK_INTAKE'
  | 'CONTEXT_ASSEMBLY'
  | 'COGNITIVE_INFERENCE'
  | 'GOVERNED_PLANNING'
  | 'ACTION_PROPOSAL'
  | 'PDP_EVALUATION'
  | 'PEP_ENFORCEMENT'
  | 'TOOL_EXECUTION'
  | 'REALITY_VERIFICATION'
  | 'DURABLE_COMMIT'
  | 'EPISODIC_SYNTHESIS'
  | 'CYCLE_EVALUATION'
  | 'TASK_COMPLETION';

/**
 * Status Taxonomy for Execution Spans
 */
export type AgentSpanStatus =
  | 'ACTIVE'
  | 'COMPLETED'
  | 'FAILED'
  | 'ABORTED'
  | 'SKIPPED';

/**
 * Telemetry Event Type Taxonomy
 */
export type AgentTelemetryEventType =
  | 'REQUEST_ACCEPTED'
  | 'CONTEXT_ASSEMBLED'
  | 'COGNITION_COMPLETED'
  | 'PLAN_FORMULATED'
  | 'ACTION_PROPOSED'
  | 'AUTHORIZATION_EVALUATED'
  | 'APPROVAL_DEMANDED'
  | 'TOOL_DISPATCHED'
  | 'TOOL_COMPLETED'
  | 'REALITY_VERIFIED'
  | 'DURABLE_COMMIT_COMPLETED'
  | 'MEMORY_SYNTHESIZED'
  | 'STEP_COMPLETED'
  | 'ITERATION_COMPLETED'
  | 'TASK_COMPLETED'
  | 'TASK_FAILED'
  | 'USER_STOP_ABORTED';

/**
 * Immutable Provenance References from Upstream Subsystems
 */
export interface AgentTraceProvenanceReferences {
  readonly verificationProvenanceHash?: string | null;
  readonly commitProvenanceHash?: string | null;
  readonly memoryProvenanceHash?: string | null;
  readonly cycleProvenanceHash?: string | null;
}

/**
 * Execution Span Contract
 */
export interface AgentExecutionSpan {
  readonly spanId: SpanId;
  readonly traceId: TraceId;
  readonly parentSpanId: ParentSpanId;
  readonly stage: AgentLifecycleStage;
  readonly status: AgentSpanStatus;
  readonly tenantId: TenantId;
  readonly taskId: TaskId;
  readonly taskVersion: number;
  readonly stepId?: StepId | null;
  readonly executionId?: ExecutionId | null;
  readonly startTimeIso: string;
  readonly endTimeIso?: string | null;
  readonly durationMs?: number | null;
  readonly attributes: Readonly<Record<string, unknown>>;
  readonly provenanceReferences: AgentTraceProvenanceReferences;
  readonly error?: {
    readonly name: string;
    readonly message: string;
  } | null;
}

/**
 * Telemetry Event Contract
 */
export interface AgentTelemetryEvent {
  readonly eventId: string;
  readonly traceId: TraceId;
  readonly spanId?: SpanId | null;
  readonly eventType: AgentTelemetryEventType;
  readonly tenantId: TenantId;
  readonly taskId: TaskId;
  readonly taskVersion: number;
  readonly timestampIso: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

/**
 * Bounded SLO Budget Summary
 */
export interface AgentSLOSummary {
  readonly taskId: TaskId;
  readonly tenantId: TenantId;
  readonly taskVersion: number;
  readonly totalElapsedMs: number;
  readonly cognitionLatencyMs: number;
  readonly toolLatencyMs: number;
  readonly verificationLatencyMs: number;
  readonly commitLatencyMs: number;
  readonly memoryLatencyMs: number;
  readonly iterationCount: number;
  readonly stepCount: number;
  readonly retryCount: number;
  readonly denialCount: number;
  readonly isWithinCeilings: boolean;
  readonly ceilingViolations: readonly string[];
}

/**
 * Root Trace Envelope Contract
 */
export interface AgentTraceEnvelope {
  readonly traceId: TraceId;
  readonly rootSpanId: SpanId;
  readonly tenantId: TenantId;
  readonly taskId: TaskId;
  readonly taskVersion: number;
  readonly startTimeIso: string;
  readonly endTimeIso?: string | null;
  readonly durationMs?: number | null;
  readonly status: 'ACTIVE' | 'SEALED' | 'ABORTED';
  readonly spans: readonly AgentExecutionSpan[];
  readonly events: readonly AgentTelemetryEvent[];
  readonly sloSummary: AgentSLOSummary;
  readonly provenanceReferences: AgentTraceProvenanceReferences;
  readonly sealedAtIso?: string | null;
}

/**
 * Runtime Result Contract
 */
export interface AgentObservabilityResult {
  readonly success: boolean;
  readonly traceId: TraceId;
  readonly envelope: AgentTraceEnvelope;
  readonly error?: {
    readonly code: string;
    readonly message: string;
  } | null;
}

/**
 * Hard Observability Ceilings (from MS-1.4.10)
 */
export const OBSERVABILITY_BOUNDS = {
  MAX_LOOP_ITERATIONS: 20,
  MAX_STEP_ATTEMPTS: 3,
  MAX_CONSECUTIVE_DENIALS: 3,
  MAX_TASK_EXECUTION_TIME_MS: 300000,
  MAX_SPANS_PER_TRACE: 500,
  MAX_EVENTS_PER_TRACE: 1000,
  MAX_PAYLOAD_SIZE_BYTES: 65536,
} as const;

/**
 * Error Taxonomy for MS-1.4.11 Observability
 */
export class AgentObservabilityError extends Error {
  public readonly code: string;
  constructor(message: string, code = 'OBSERVABILITY_ERROR') {
    super(message);
    this.name = 'AgentObservabilityError';
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AgentObservabilityAbortedError extends AgentObservabilityError {
  public readonly reason: string;
  constructor(reason: string) {
    super(`Agent observability aborted: ${reason}`, 'OBSERVABILITY_ABORTED');
    this.name = 'AgentObservabilityAbortedError';
    this.reason = reason;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AgentObservabilityValidationError extends AgentObservabilityError {
  constructor(message: string) {
    super(message, 'OBSERVABILITY_VALIDATION_ERROR');
    this.name = 'AgentObservabilityValidationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AgentObservabilityConcurrencyError extends AgentObservabilityError {
  constructor(message: string) {
    super(message, 'OBSERVABILITY_CONCURRENCY_ERROR');
    this.name = 'AgentObservabilityConcurrencyError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AgentObservabilitySecurityError extends AgentObservabilityError {
  constructor(message: string) {
    super(message, 'OBSERVABILITY_SECURITY_ERROR');
    this.name = 'AgentObservabilitySecurityError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Deeply freeze an object recursively to guarantee immutability
 */
export function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      deepFreeze(obj[i]);
    }
  } else {
    for (const key of Object.keys(obj)) {
      const val = (obj as Record<string, unknown>)[key];
      if (val !== null && typeof val === 'object') {
        deepFreeze(val);
      }
    }
  }
  return Object.freeze(obj);
}
