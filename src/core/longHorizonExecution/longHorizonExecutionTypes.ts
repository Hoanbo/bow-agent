// src/core/longHorizonExecution/longHorizonExecutionTypes.ts
// BOWCON V4.0 — MS-1.5.11: LONG-HORIZON EXECUTION TYPES & CONTRACTS
// Component 1078 — REAL
//
// EN: Authoritative type definitions, lifecycle states, autonomy budget contracts,
//     provenance functions, and governance error taxonomy for long-horizon execution.
// VI: Định nghĩa kiểu có thẩm quyền, trạng thái vòng đời, hợp đồng ngân sách tự chủ,
//     hàm nguồn gốc và phân loại lỗi quản trị cho thực thi tầm nhìn dài.

import crypto from 'node:crypto';
import type { GroundedPlanTaskBinding } from '../groundedPlanTaskBridge/groundedPlanTaskTypes.js';
import type { AgentTask } from '../taskLifecycle/agentTaskTypes.js';
import type { MultiStepExecutionSession, MultiStepExecutionResult } from '../multiStepExecution/multiStepExecutionTypes.js';

// ============================================================================
// Centralized Hard Constraints & Safe Defaults
// ============================================================================
export const LONG_HORIZON_SCHEMA_VERSION = '4.0.0';
export const MAX_LONG_HORIZON_GENERATIONS = 10;
export const MAX_LONG_HORIZON_STEPS = 100;
export const MAX_REPLANNING_ATTEMPTS = 10;
export const MAX_EXECUTION_ATTEMPTS_PER_STEP = 3;
export const MAX_CONSECUTIVE_FAILURES = 3;
export const MAX_STAGNATION_CYCLES = 3;
export const MAX_OBJECTIVE_EXTENSIONS = 3;
export const MAX_PENDING_APPROVALS = 1;
export const MAX_WALL_CLOCK_MS = 60 * 60 * 1000; // 1 hour ceiling

// ============================================================================
// Lifecycle State Machine
// ============================================================================
export type LongHorizonState =
  | 'INITIALIZING'
  | 'AUTHORIZED'
  | 'READY'
  | 'EXECUTING'
  | 'EVALUATING_PROGRESS'
  | 'ENVIRONMENT_CHECK'
  | 'REPLANNING_REQUIRED'
  | 'AWAITING_AUTHORIZATION_REFRESH'
  | 'AWAITING_HUMAN_CONFIRMATION'
  | 'PAUSED'
  | 'RESUMING'
  | 'COMPLETED'
  | 'FAILED'
  | 'BUDGET_EXHAUSTED'
  | 'STAGNATED'
  | 'ABORTED'
  | 'INVALIDATED'
  | 'EXPIRED'
  | 'RECOVERY_REQUIRED'
  | 'TERMINATED';

// ============================================================================
// Progress Classification
// ============================================================================
export type ProgressClassification =
  | 'PROGRESS'
  | 'NO_PROGRESS'
  | 'PARTIAL_PROGRESS'
  | 'REGRESSION'
  | 'UNKNOWN'
  | 'SUCCESS'
  | 'FAILURE'
  | 'INVALIDATED';

// ============================================================================
// Autonomy Budget & Resource Usage Contracts
// ============================================================================
export interface LongHorizonAutonomyBudget {
  readonly maxGenerations: number;
  readonly maxSteps: number;
  readonly maxReplanningAttempts: number;
  readonly maxExecutionAttempts: number;
  readonly maxExecutionAttemptsPerStep: number;
  readonly maxConsecutiveFailures: number;
  readonly maxStagnationCycles: number;
  readonly maxObjectiveExtensions: number;
  readonly maxPendingApprovals: number;
  readonly maxWallClockMs: number;
}

export interface LongHorizonResourceUsage {
  readonly generationsConsumed: number;
  readonly stepsConsumed: number;
  readonly executionAttempts: number;
  readonly replanningAttempts: number;
  readonly consecutiveFailures: number;
  readonly stagnationCycles: number;
  readonly approvalsRequested: number;
  readonly environmentChecks: number;
  readonly persistenceOperations: number;
  readonly wallClockStartTime: string;
  readonly wallClockElapsedMs: number;
}

// ============================================================================
// Governed Objective Envelope
// ============================================================================
export interface GovernedLongHorizonObjective {
  readonly objectiveId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly originatingTaskId: string;
  readonly sourcePlanProvenance: string;
  readonly objectiveDescription: string;
  readonly objectiveConstraints: readonly string[];
  readonly successCriteria: readonly string[];
  readonly failureCriteria: readonly string[];
  readonly autonomyBudget: LongHorizonAutonomyBudget;
  readonly authorizationScope:
    | {
        readonly allowedDomains?: readonly string[];
        readonly maxRiskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        readonly requiredCapabilities?: readonly string[];
      }
    | readonly string[]
    | any;
  readonly riskPolicy: {
    readonly maxAllowedRisk?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    readonly maxPermittedRiskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    readonly requiresHumanForHighRisk?: boolean;
    readonly requireHumanConfirmationForHighRisk?: boolean;
    readonly allowedCapabilities?: readonly string[];
  } | any;
  readonly currentGenerationId: string;
  readonly currentState: LongHorizonState;
  readonly provenanceHash: string;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly version: number;
}

// ============================================================================
// Long-Horizon Generation Contract
// ============================================================================
export interface LongHorizonGeneration {
  readonly generationId: string;
  readonly parentGenerationId?: string;
  readonly generationNumber: number;
  readonly objectiveId: string;
  readonly multiStepSessionId: string;
  readonly planProvenance: string;
  readonly taskProvenance: string;
  readonly authorizationProvenance: string;
  readonly environmentProvenance: string;
  readonly leaseProvenance: string;
  readonly resultProvenance?: string;
  readonly status: 'ACTIVE' | 'SUPERSEDED' | 'ABORTED' | 'INVALIDATED' | 'COMPLETED';
  readonly createdAt: string;
  readonly supersededAt?: string;
  readonly provenanceHash: string;
  readonly version: number;
}

// ============================================================================
// Progress Record Contract
// ============================================================================
export interface LongHorizonProgressRecord {
  readonly recordId: string;
  readonly objectiveId: string;
  readonly generationId: string;
  readonly completedSteps: number;
  readonly verifiedOutcomes: readonly string[];
  readonly environmentSnapshotProvenance: string;
  readonly objectiveProgressState: ProgressClassification;
  readonly progressScore: number;
  readonly failureCount: number;
  readonly stagnationCounter: number;
  readonly timestamp: string;
  readonly provenanceHash: string;
}

// ============================================================================
// Long-Horizon Session State & Persistence Document
// ============================================================================
export interface LongHorizonSession {
  readonly horizonSessionId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly objective: GovernedLongHorizonObjective;
  readonly budget: LongHorizonAutonomyBudget;
  readonly usage: LongHorizonResourceUsage;
  readonly generations: readonly LongHorizonGeneration[];
  readonly progressLedger: readonly LongHorizonProgressRecord[];
  readonly currentState: LongHorizonState;
  readonly sessionVersion: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly provenanceHash: string;
}

export interface LongHorizonSessionDocument {
  readonly schemaVersion: string;
  readonly session: LongHorizonSession;
  readonly sessionVersion: number;
  readonly documentHash: string;
  readonly updatedAt: string;
}

// ============================================================================
// Terminal Result Contract
// ============================================================================
export interface LongHorizonExecutionResult {
  readonly horizonSessionId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly objectiveId: string;
  readonly finalState: LongHorizonState;
  readonly progressSummary: {
    readonly finalClassification: ProgressClassification;
    readonly totalGenerations: number;
    readonly totalStepsCompleted: number;
    readonly totalReplanningAttempts: number;
    readonly verifiedOutcomes: readonly string[];
  };
  readonly usage: LongHorizonResourceUsage;
  readonly completedAt: string;
  readonly provenanceHash: string;
}

// ============================================================================
// Governance Error Taxonomy
// ============================================================================
export class LongHorizonExecutionError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(`[LONG_HORIZON_${code}] ${message}`);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details ? Object.freeze({ ...details }) : undefined;
  }
}

export class LongHorizonValidationError extends LongHorizonExecutionError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, details);
  }
}

export class LongHorizonAuthorizationError extends LongHorizonExecutionError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('AUTHORIZATION_ERROR', message, details);
  }
}

export class LongHorizonBudgetExhaustedError extends LongHorizonExecutionError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('BUDGET_EXHAUSTED', message, details);
  }
}

export class LongHorizonStagnationError extends LongHorizonExecutionError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('STAGNATION_ERROR', message, details);
  }
}

export class LongHorizonGenerationError extends LongHorizonExecutionError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('GENERATION_ERROR', message, details);
  }
}

export class LongHorizonTenantIsolationError extends LongHorizonExecutionError {
  constructor(expectedTenant: string, actualTenant: string) {
    super(
      'TENANT_ISOLATION_VIOLATION',
      `Tenant breach: expected "${expectedTenant}", received "${actualTenant}"`,
      { expectedTenant, actualTenant }
    );
  }
}

export class LongHorizonSessionIsolationError extends LongHorizonExecutionError {
  constructor(expectedSession: string, actualSession: string) {
    super(
      'SESSION_ISOLATION_VIOLATION',
      `Session breach: expected "${expectedSession}", received "${actualSession}"`,
      { expectedSession, actualSession }
    );
  }
}

export class LongHorizonUserStopError extends LongHorizonExecutionError {
  constructor(checkpoint: string) {
    super(
      'USER_STOP_PREEMPTION',
      `Execution immediately halted by Master Human Authority USER_STOP at checkpoint: "${checkpoint}"`,
      { checkpoint }
    );
  }
}

export class LongHorizonConcurrencyError extends LongHorizonExecutionError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('CONCURRENCY_ERROR', message, details);
  }
}

export class LongHorizonPersistenceError extends LongHorizonExecutionError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('PERSISTENCE_ERROR', message, details);
  }
}

export class LongHorizonContinuityError extends LongHorizonExecutionError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('CONTINUITY_ERROR', message, details);
  }
}

export class LongHorizonReplanningError extends LongHorizonExecutionError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('REPLANNING_ERROR', message, details);
  }
}

export class LongHorizonSecurityBoundaryError extends LongHorizonExecutionError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('SECURITY_BOUNDARY_ERROR', message, details);
  }
}

export { LongHorizonExecutionError as LongHorizonGovernanceError };

// ============================================================================
// Cryptographic Provenance Functions
// ============================================================================
export function computeObjectiveProvenanceHash(
  objective: Omit<GovernedLongHorizonObjective, 'provenanceHash'>
): string {
  const canonical = JSON.stringify({
    objectiveId: objective.objectiveId,
    tenantId: objective.tenantId,
    sessionId: objective.sessionId,
    originatingTaskId: objective.originatingTaskId,
    sourcePlanProvenance: objective.sourcePlanProvenance,
    objectiveDescription: objective.objectiveDescription,
    objectiveConstraints: objective.objectiveConstraints,
    successCriteria: objective.successCriteria,
    failureCriteria: objective.failureCriteria,
    autonomyBudget: objective.autonomyBudget,
    authorizationScope: objective.authorizationScope,
    riskPolicy: objective.riskPolicy,
    createdAt: objective.createdAt,
    expiresAt: objective.expiresAt,
    version: objective.version,
  });
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}

export function computeLongHorizonGenerationProvenanceHash(
  gen: Omit<LongHorizonGeneration, 'provenanceHash'>
): string {
  const canonical = JSON.stringify({
    generationId: gen.generationId,
    parentGenerationId: gen.parentGenerationId,
    generationNumber: gen.generationNumber,
    objectiveId: gen.objectiveId,
    multiStepSessionId: gen.multiStepSessionId,
    planProvenance: gen.planProvenance,
    taskProvenance: gen.taskProvenance,
    authorizationProvenance: gen.authorizationProvenance,
    environmentProvenance: gen.environmentProvenance,
    leaseProvenance: gen.leaseProvenance,
    resultProvenance: gen.resultProvenance,
    status: gen.status,
    createdAt: gen.createdAt,
    supersededAt: gen.supersededAt,
    version: gen.version,
  });
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}

export function computeLongHorizonProgressProvenanceHash(
  rec: Omit<LongHorizonProgressRecord, 'provenanceHash'>
): string {
  const canonical = JSON.stringify({
    recordId: rec.recordId,
    objectiveId: rec.objectiveId,
    generationId: rec.generationId,
    completedSteps: rec.completedSteps,
    verifiedOutcomes: rec.verifiedOutcomes,
    environmentSnapshotProvenance: rec.environmentSnapshotProvenance,
    objectiveProgressState: rec.objectiveProgressState,
    progressScore: rec.progressScore,
    failureCount: rec.failureCount,
    stagnationCounter: rec.stagnationCounter,
    timestamp: rec.timestamp,
  });
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}

export function computeLongHorizonSessionProvenanceHash(
  session: Omit<LongHorizonSession, 'provenanceHash'>
): string {
  const canonical = JSON.stringify({
    horizonSessionId: session.horizonSessionId,
    tenantId: session.tenantId,
    sessionId: session.sessionId,
    objectiveHash: session.objective.provenanceHash,
    budget: session.budget,
    usage: session.usage,
    generations: session.generations.map((g) => g.provenanceHash),
    progressLedger: session.progressLedger.map((p) => p.provenanceHash),
    currentState: session.currentState,
    sessionVersion: session.sessionVersion,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  });
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}

export function computeLongHorizonDocumentProvenanceHash(
  doc: Omit<LongHorizonSessionDocument, 'documentHash'>
): string {
  const canonical = JSON.stringify({
    schemaVersion: doc.schemaVersion,
    sessionHash: doc.session.provenanceHash,
    sessionVersion: doc.sessionVersion,
    updatedAt: doc.updatedAt,
  });
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}

export function computeLongHorizonResultProvenanceHash(
  res: Omit<LongHorizonExecutionResult, 'provenanceHash'>
): string {
  const canonical = JSON.stringify({
    horizonSessionId: res.horizonSessionId,
    tenantId: res.tenantId,
    sessionId: res.sessionId,
    objectiveId: res.objectiveId,
    finalState: res.finalState,
    progressSummary: res.progressSummary,
    usage: res.usage,
    completedAt: res.completedAt,
  });
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}
