// src/core/multiStepExecution/multiStepExecutionTypes.ts
// BOWCON V4.0 — MS-1.5.10: MULTI-STEP EXECUTION TYPES & PROVENANCE
// Component 1068 — REAL
//
// EN: Canonical type definitions, schemas, bounded constants, typed errors,
//     and deterministic SHA-256 provenance helpers for governed multi-step execution.
// VI: Định nghĩa kiểu dữ liệu chuẩn mực, cấu trúc lược đồ, hằng số giới hạn, lỗi định kiểu,
//     và các hàm trợ giúp provenance SHA-256 xác định cho việc thực thi nhiều bước có quản trị.

import crypto from 'node:crypto';
import type { GroundedPlanTaskBinding } from '../groundedPlanTaskBridge/groundedPlanTaskTypes.js';
import type { AgentTask } from '../taskLifecycle/agentTaskTypes.js';
import type {
  ExecutionLease,
  ExecutionOperationKind,
  GovernedExecutionResultEnvelope,
} from '../governedExecution/executionTypes.js';

// ============================================================================
// BOUNDED CONSTANTS (HẰNG SỐ GIỚI HẠN)
// ============================================================================

export const MAX_EXECUTION_STEPS = 10;
export const MAX_REPLANNING_GENERATIONS = 10;
export const MAX_REPLANS_PER_SESSION = 10;
export const MULTI_STEP_EXECUTION_SCHEMA_VERSION = '4.0.0';

// ============================================================================
// LIFECYCLE & STATUS UNIONS (TRẠNG THÁI VÒNG ĐỜI)
// ============================================================================

export type MultiStepExecutionStatus =
  | 'DRAFT'
  | 'VALIDATED'
  | 'READY'
  | 'AUTHORIZATION_PENDING'
  | 'AUTHORIZED'
  | 'EXECUTING'
  | 'STEP_COMPLETED'
  | 'ENVIRONMENT_VERIFICATION'
  | 'PAUSED'
  | 'REPLANNING_REQUIRED'
  | 'REPLAN_PENDING'
  | 'NEW_GENERATION'
  | 'COMPLETED'
  | 'FAILED'
  | 'DENIED'
  | 'CANCELLED'
  | 'PREEMPTED'
  | 'INVALIDATED';

export type GenerationStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'PAUSED'
  | 'SUPERSEDED'
  | 'COMPLETED'
  | 'FAILED'
  | 'INVALIDATED';

export type StepExecutionStatus =
  | 'PENDING'
  | 'READY'
  | 'AUTHORIZATION_PENDING'
  | 'AUTHORIZED'
  | 'EXECUTING'
  | 'COMPLETED'
  | 'FAILED'
  | 'SKIPPED'
  | 'INVALIDATED'
  | 'PREEMPTED';

export type ExecutionEnvironmentValidity =
  | 'UNCHANGED'
  | 'CHANGED'
  | 'INVALID'
  | 'UNKNOWN';

export type MultiStepExecutionEvent =
  | 'MULTI_STEP_STARTED'
  | 'STEP_READY'
  | 'STEP_AUTHORIZATION_REQUIRED'
  | 'STEP_AUTHORIZED'
  | 'STEP_EXECUTION_STARTED'
  | 'STEP_EXECUTION_SUCCEEDED'
  | 'STEP_EXECUTION_FAILED'
  | 'ENVIRONMENT_CHECKED'
  | 'ENVIRONMENT_CHANGED'
  | 'EXECUTION_PAUSED'
  | 'REPLANNING_REQUIRED'
  | 'REPLANNING_STARTED'
  | 'GENERATION_CREATED'
  | 'GENERATION_AUTHORIZATION_REQUIRED'
  | 'GENERATION_AUTHORIZED'
  | 'MULTI_STEP_COMPLETED'
  | 'MULTI_STEP_FAILED'
  | 'MULTI_STEP_DENIED'
  | 'MULTI_STEP_CANCELLED'
  | 'MULTI_STEP_PREEMPTED'
  | 'MULTI_STEP_INVALIDATED';

// ============================================================================
// DATA CONTRACTS (HỢP ĐỒNG DỮ LIỆU)
// ============================================================================

export interface MultiStepExecutionStepState {
  readonly stepId: string;
  readonly stepIndex: number;
  readonly title: string;
  readonly operationKind: ExecutionOperationKind;
  readonly dependencies: readonly string[];
  readonly status: StepExecutionStatus;
  readonly leaseId?: string;
  readonly executionId?: string;
  readonly resultEnvelope?: GovernedExecutionResultEnvelope;
  readonly failureReason?: string;
  readonly updatedAt: string;
}

export interface ExecutionEnvironmentSnapshot {
  readonly snapshotId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly generationId: string;
  readonly stepId?: string;
  readonly screenStateHash?: string;
  readonly observedElements?: readonly { readonly id: string; readonly label?: string; readonly bounds?: unknown }[];
  readonly systemPreconditions: Readonly<Record<string, boolean | string | number>>;
  readonly observedPreconditions: Readonly<Record<string, boolean | string | number>>;
  readonly timestamp: string;
  readonly provenanceHash: string;
}

export interface ExecutionStepCheckpoint {
  readonly checkpointId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly generationId: string;
  readonly stepId: string;
  readonly stepIndex: number;
  readonly status: StepExecutionStatus;
  readonly resultSummary?: Readonly<Record<string, unknown>>;
  readonly environmentSnapshotHash: string;
  readonly timestamp: string;
  readonly provenanceHash: string;
}

export interface ReplanningRequest {
  readonly requestId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly sourceGenerationId: string;
  readonly sourceGenerationIndex: number;
  readonly taskId: string;
  readonly planId: string;
  readonly completedStepIds: readonly string[];
  readonly failedStepId?: string;
  readonly invalidatedStepIds: readonly string[];
  readonly environmentSnapshot: ExecutionEnvironmentSnapshot;
  readonly reason: string;
  readonly affectedDependencies: readonly string[];
  readonly remainingObjective: string;
  readonly provenanceHash: string;
  readonly timestamp: string;
}

export interface MultiStepExecutionGeneration {
  readonly generationId: string;
  readonly generationIndex: number;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly taskId: string;
  readonly planId: string;
  readonly planVersion: number;
  readonly bindingSnapshot: GroundedPlanTaskBinding;
  readonly taskSnapshot: AgentTask;
  readonly stepStates: Readonly<Record<string, MultiStepExecutionStepState>>;
  readonly status: GenerationStatus;
  readonly provenanceHash: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface MultiStepExecutionSession {
  readonly sessionId: string;
  readonly tenantId: string;
  readonly taskId: string;
  readonly planId: string;
  readonly activeGenerationId: string;
  readonly status: MultiStepExecutionStatus;
  readonly sessionVersion: number;
  readonly generations: readonly MultiStepExecutionGeneration[];
  readonly checkpoints: readonly ExecutionStepCheckpoint[];
  readonly provenanceRoot: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface MultiStepExecutionResult {
  readonly sessionId: string;
  readonly tenantId: string;
  readonly taskId: string;
  readonly status: MultiStepExecutionStatus;
  readonly totalSteps: number;
  readonly completedSteps: number;
  readonly failedSteps: number;
  readonly replanningGenerations: number;
  readonly stepResults: readonly GovernedExecutionResultEnvelope[];
  readonly finalOutcome: string;
  readonly provenanceHash: string;
  readonly sessionVersion: number;
  readonly timestamp: string;
}

export interface MultiStepExecutionSessionDocument {
  readonly schemaVersion: string;
  readonly session: MultiStepExecutionSession;
  readonly activeGeneration?: MultiStepExecutionGeneration;
  readonly replanningRequests: readonly ReplanningRequest[];
  readonly environmentSnapshots: readonly ExecutionEnvironmentSnapshot[];
  readonly executionResults: readonly GovernedExecutionResultEnvelope[];
  readonly provenanceHash: string;
  readonly sessionVersion: number;
  readonly updatedAt: string;
}

// ============================================================================
// TYPED ERROR HIERARCHY (HỆ THỐNG LỖI ĐỊNH KIỂU)
// ============================================================================

export class MultiStepExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MultiStepExecutionError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class MultiStepExecutionValidationError extends MultiStepExecutionError {
  constructor(message: string) {
    super(message);
    this.name = 'MultiStepExecutionValidationError';
  }
}

export class MultiStepExecutionAuthorizationError extends MultiStepExecutionError {
  constructor(message: string) {
    super(message);
    this.name = 'MultiStepExecutionAuthorizationError';
  }
}

export class MultiStepExecutionLeaseError extends MultiStepExecutionError {
  constructor(message: string) {
    super(message);
    this.name = 'MultiStepExecutionLeaseError';
  }
}

export class MultiStepExecutionDependencyError extends MultiStepExecutionError {
  constructor(message: string) {
    super(message);
    this.name = 'MultiStepExecutionDependencyError';
  }
}

export class MultiStepExecutionEnvironmentError extends MultiStepExecutionError {
  constructor(message: string) {
    super(message);
    this.name = 'MultiStepExecutionEnvironmentError';
  }
}

export class MultiStepExecutionReplanningError extends MultiStepExecutionError {
  constructor(message: string) {
    super(message);
    this.name = 'MultiStepExecutionReplanningError';
  }
}

export class MultiStepExecutionGenerationError extends MultiStepExecutionError {
  constructor(message: string) {
    super(message);
    this.name = 'MultiStepExecutionGenerationError';
  }
}

export class MultiStepExecutionTenantIsolationError extends MultiStepExecutionError {
  constructor(message: string) {
    super(message);
    this.name = 'MultiStepExecutionTenantIsolationError';
  }
}

export class MultiStepExecutionSessionIsolationError extends MultiStepExecutionError {
  constructor(message: string) {
    super(message);
    this.name = 'MultiStepExecutionSessionIsolationError';
  }
}

export class MultiStepExecutionConcurrencyError extends MultiStepExecutionError {
  constructor(message: string) {
    super(message);
    this.name = 'MultiStepExecutionConcurrencyError';
  }
}

export class MultiStepExecutionUserStopError extends MultiStepExecutionError {
  public readonly checkpoint: string;
  constructor(checkpoint: string) {
    super(`Execution preempted by USER_STOP at checkpoint: ${checkpoint}`);
    this.name = 'MultiStepExecutionUserStopError';
    this.checkpoint = checkpoint;
  }
}

export class MultiStepExecutionPersistenceError extends MultiStepExecutionError {
  constructor(message: string) {
    super(message);
    this.name = 'MultiStepExecutionPersistenceError';
  }
}

// ============================================================================
// CANONICAL DETERMINISTIC SHA-256 PROVENANCE HELPERS
// (CÁC HÀM TRỢ GIÚP PROVENANCE SHA-256 XÁC ĐỊNH)
// ============================================================================

export function deterministicJsonStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map(deterministicJsonStringify).join(',')}]`;
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const pairs = keys.map(
    (k) => `${JSON.stringify(k)}:${deterministicJsonStringify((obj as Record<string, unknown>)[k])}`
  );
  return `{${pairs.join(',')}}`;
}

export function computeSha256(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

export function computeGenerationProvenanceHash(generation: Omit<MultiStepExecutionGeneration, 'provenanceHash'>): string {
  const payload = {
    generationId: generation.generationId,
    generationIndex: generation.generationIndex,
    tenantId: generation.tenantId,
    sessionId: generation.sessionId,
    taskId: generation.taskId,
    planId: generation.planId,
    planVersion: generation.planVersion,
    bindingSnapshotHash: generation.bindingSnapshot.provenanceHash,
    taskSnapshotId: generation.taskSnapshot.taskId,
    stepStates: generation.stepStates,
    status: generation.status,
    createdAt: generation.createdAt,
  };
  return computeSha256(deterministicJsonStringify(payload));
}

export function computeEnvironmentSnapshotProvenanceHash(snapshot: Omit<ExecutionEnvironmentSnapshot, 'provenanceHash'>): string {
  const payload = {
    snapshotId: snapshot.snapshotId,
    tenantId: snapshot.tenantId,
    sessionId: snapshot.sessionId,
    generationId: snapshot.generationId,
    stepId: snapshot.stepId ?? '',
    screenStateHash: snapshot.screenStateHash ?? '',
    observedElements: snapshot.observedElements ?? [],
    systemPreconditions: snapshot.systemPreconditions,
    observedPreconditions: snapshot.observedPreconditions,
    timestamp: snapshot.timestamp,
  };
  return computeSha256(deterministicJsonStringify(payload));
}

export function computeStepCheckpointProvenanceHash(checkpoint: Omit<ExecutionStepCheckpoint, 'provenanceHash'>): string {
  const payload = {
    checkpointId: checkpoint.checkpointId,
    tenantId: checkpoint.tenantId,
    sessionId: checkpoint.sessionId,
    generationId: checkpoint.generationId,
    stepId: checkpoint.stepId,
    stepIndex: checkpoint.stepIndex,
    status: checkpoint.status,
    resultSummary: checkpoint.resultSummary ?? {},
    environmentSnapshotHash: checkpoint.environmentSnapshotHash,
    timestamp: checkpoint.timestamp,
  };
  return computeSha256(deterministicJsonStringify(payload));
}

export function computeReplanningRequestProvenanceHash(request: Omit<ReplanningRequest, 'provenanceHash'>): string {
  const payload = {
    requestId: request.requestId,
    tenantId: request.tenantId,
    sessionId: request.sessionId,
    sourceGenerationId: request.sourceGenerationId,
    sourceGenerationIndex: request.sourceGenerationIndex,
    taskId: request.taskId,
    planId: request.planId,
    completedStepIds: request.completedStepIds,
    failedStepId: request.failedStepId ?? '',
    invalidatedStepIds: request.invalidatedStepIds,
    environmentSnapshotHash: request.environmentSnapshot.provenanceHash,
    reason: request.reason,
    affectedDependencies: request.affectedDependencies,
    remainingObjective: request.remainingObjective,
    timestamp: request.timestamp,
  };
  return computeSha256(deterministicJsonStringify(payload));
}

export function computeMultiStepSessionProvenanceHash(session: Omit<MultiStepExecutionSession, 'provenanceRoot'>): string {
  const payload = {
    sessionId: session.sessionId,
    tenantId: session.tenantId,
    taskId: session.taskId,
    planId: session.planId,
    activeGenerationId: session.activeGenerationId,
    status: session.status,
    sessionVersion: session.sessionVersion,
    generationHashes: session.generations.map((g) => g.provenanceHash),
    checkpointHashes: session.checkpoints.map((c) => c.provenanceHash),
    createdAt: session.createdAt,
  };
  return computeSha256(deterministicJsonStringify(payload));
}

export function computeMultiStepResultProvenanceHash(result: Omit<MultiStepExecutionResult, 'provenanceHash'>): string {
  const payload = {
    sessionId: result.sessionId,
    tenantId: result.tenantId,
    taskId: result.taskId,
    status: result.status,
    totalSteps: result.totalSteps,
    completedSteps: result.completedSteps,
    failedSteps: result.failedSteps,
    replanningGenerations: result.replanningGenerations,
    stepResultHashes: result.stepResults.map((r) => r.provenanceHash),
    finalOutcome: result.finalOutcome,
    sessionVersion: result.sessionVersion,
    timestamp: result.timestamp,
  };
  return computeSha256(deterministicJsonStringify(payload));
}

export function computeSessionDocumentProvenanceHash(doc: Omit<MultiStepExecutionSessionDocument, 'provenanceHash'>): string {
  const payload = {
    schemaVersion: doc.schemaVersion,
    sessionHash: doc.session.provenanceRoot,
    activeGenerationHash: doc.activeGeneration?.provenanceHash ?? '',
    replanningRequestHashes: doc.replanningRequests.map((r) => r.provenanceHash),
    environmentSnapshotHashes: doc.environmentSnapshots.map((e) => e.provenanceHash),
    executionResultHashes: doc.executionResults.map((r) => r.provenanceHash),
    sessionVersion: doc.sessionVersion,
    updatedAt: doc.updatedAt,
  };
  return computeSha256(deterministicJsonStringify(payload));
}
