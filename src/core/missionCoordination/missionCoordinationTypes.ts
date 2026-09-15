// src/core/missionCoordination/missionCoordinationTypes.ts
// BOWCON V4.0 — MS-1.5.13: NATIVE GOVERNED MISSION COORDINATION, MULTI-OBJECTIVE PRIORITIZATION & SUPERVISED CONTINUATION ENGINE
// Component 1098 — REAL
//
// EN: Canonical contracts, mission lifecycle states, conflict taxonomy, error hierarchy,
//     and deterministic SHA-256 provenance functions for governed mission coordination.
// VI: Hợp đồng chính tắc, trạng thái vòng đời sứ mệnh, phân loại xung đột, hệ thống phân cấp lỗi,
//     và các hàm nguồn gốc SHA-256 xác định cho điều phối sứ mệnh có quản trị.

import { createHash } from 'node:crypto';

// ============================================================================
// CONSTANTS & HARD CEILINGS
// ============================================================================

export const MISSION_COORDINATION_SCHEMA_VERSION = '1.5.13';

/** Hard structural mission boundaries / Các giới hạn trần sứ mệnh cấu trúc cứng */
export const MAX_OBJECTIVES_PER_MISSION = 20;
export const MAX_ACTIVE_OBJECTIVE_SESSIONS = 3;
export const MAX_COORDINATION_CYCLES = 100;
export const MAX_REASSESSMENTS = 10;
export const MAX_MISSION_DURATION_MS = 86_400_000; // 24 hours
export const MAX_OBJECTIVE_RETRIES = 3;
export const MAX_CONSECUTIVE_MISSION_FAILURES = 3;
export const MAX_OBJECTIVE_DEPENDENCY_DEPTH = 10;
export const MAX_STARVATION_CYCLES = 5;

// ============================================================================
// LIFECYCLE & TAXONOMY
// ============================================================================

export type MissionState =
  | 'INITIALIZING'
  | 'AUTHORIZED'
  | 'READY'
  | 'COORDINATING'
  | 'OBJECTIVE_ACTIVE'
  | 'OBJECTIVE_BLOCKED'
  | 'REVIEW_REQUIRED'
  | 'SUSPENDED'
  | 'RESUMABLE'
  | 'COMPLETED'
  | 'FAILED'
  | 'HALTED_BY_USER_STOP'
  | 'HALTED_BY_EMERGENCY_STOP'
  | 'INVALIDATED';

export type MissionObjectiveState =
  | 'REGISTERED'
  | 'BLOCKED'
  | 'READY'
  | 'DELEGATED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type MissionConflictCategory =
  | 'NONE'
  | 'RESOURCE_CONFLICT'
  | 'SCOPE_CONFLICT'
  | 'DEPENDENCY_CONFLICT'
  | 'ENVIRONMENT_CONFLICT'
  | 'AUTHORIZATION_CONFLICT'
  | 'LEASE_CONFLICT'
  | 'POLICY_CONFLICT'
  | 'OBJECTIVE_CONFLICT';

export type MissionRiskTier = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// ============================================================================
// DATA CONTRACTS
// ============================================================================

export interface MissionBudgetSnapshot {
  readonly maxObjectives: number;
  readonly objectivesRegistered: number;
  readonly maxActiveObjectiveSessions: number;
  readonly activeObjectiveSessions: number;
  readonly maxCoordinationCycles: number;
  readonly coordinationCyclesConsumed: number;
  readonly maxReassessments: number;
  readonly reassessmentsConsumed: number;
  readonly missionDurationLimitMs: number;
  readonly missionStartedAt: number;
  readonly consecutiveFailures: number;
}

export interface MissionAuthorizationEnvelope {
  readonly envelopeId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly humanOperatorId: string;
  readonly authorizationScope: readonly string[];
  readonly riskTier: MissionRiskTier;
  readonly humanConfirmationToken?: string;
  readonly humanConfirmationExpiresAt?: number;
  readonly leaseId: string;
  readonly issuedAt: number;
  readonly expiresAt: number;
  readonly provenanceHash: string;
}

export interface MissionObjectiveBinding {
  readonly objectiveId: string;
  readonly title: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly authorizationScope: readonly string[];
  readonly riskTier: MissionRiskTier;
  readonly leaseId: string;
  readonly dependencies: readonly string[];
  readonly priorityScore: number;
  readonly humanExplicitPriority?: number;
  readonly state: MissionObjectiveState;
  readonly failureAttempts: number;
  readonly starvationAge: number;
  readonly boundAt: number;
  readonly completedAt?: number;
  readonly resultSummary?: string;
  readonly bindingHash: string;
}

export interface MissionDependencyGraph {
  readonly nodes: readonly string[];
  readonly edges: readonly { readonly from: string; readonly to: string }[];
  readonly depthMap: Record<string, number>;
}

export interface MissionPriorityPolicy {
  readonly basePriorityWeight: number;
  readonly dependencyReadinessWeight: number;
  readonly urgencyWeight: number;
  readonly starvationWeight: number;
  readonly riskTierPenaltyWeight: number;
  readonly immutableHumanPriorityOverride: boolean;
}

export interface MissionConflict {
  readonly conflictId: string;
  readonly category: MissionConflictCategory;
  readonly affectedObjectiveIds: readonly string[];
  readonly description: string;
  readonly isResolvable: boolean;
  readonly resolutionStrategy?: string;
  readonly detectedAt: number;
  readonly resolvedAt?: number;
}

export interface MissionReassessmentRecord {
  readonly reassessmentId: string;
  readonly cycleNumber: number;
  readonly triggerReason: string;
  readonly eligibleObjectiveIds: readonly string[];
  readonly selectedObjectiveId?: string;
  readonly timestamp: number;
  readonly recordHash: string;
}

export interface MissionContinuitySnapshot {
  readonly snapshotId: string;
  readonly missionId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly coordinationCycle: number;
  readonly missionState: MissionState;
  readonly completedObjectiveIds: readonly string[];
  readonly activeObjectiveIds: readonly string[];
  readonly pendingObjectiveIds: readonly string[];
  readonly blockedObjectiveIds: readonly string[];
  readonly priorityOrder: readonly string[];
  readonly activeConflicts: readonly MissionConflict[];
  readonly budgetState: MissionBudgetSnapshot;
  readonly environmentFingerprint: string;
  readonly previousSnapshotHash: string;
  readonly currentSnapshotHash: string;
  readonly timestamp: number;
}

export interface GovernedMission {
  readonly missionId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly humanOperatorId: string;
  readonly title: string;
  readonly description: string;
  readonly objectiveIds: readonly string[];
  readonly authorizationScope: readonly string[];
  readonly riskTier: MissionRiskTier;
  readonly status: MissionState;
  readonly priorityPolicy: MissionPriorityPolicy;
  readonly dependencyGraph: MissionDependencyGraph;
  readonly objectives: Record<string, MissionObjectiveBinding>;
  readonly conflicts: readonly MissionConflict[];
  readonly budget: MissionBudgetSnapshot;
  readonly authorizationEnvelope: MissionAuthorizationEnvelope;
  readonly continuitySnapshots: readonly MissionContinuitySnapshot[];
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly generation: number;
  readonly missionVersion: number;
  readonly provenanceHash: string;
}

export interface MissionCoordinationResult {
  readonly missionId: string;
  readonly tenantId: string;
  readonly finalState: MissionState;
  readonly completedSuccessfully: boolean;
  readonly completedObjectiveCount: number;
  readonly failedObjectiveCount: number;
  readonly totalCyclesExecuted: number;
  readonly totalReassessments: number;
  readonly wallClockDurationMs: number;
  readonly finalSnapshotHash: string;
  readonly auditChainHeadHash: string;
  readonly summaryDetails: string;
}

// ============================================================================
// GOVERNANCE ERROR TAXONOMY
// ============================================================================

export class MissionCoordinationError extends Error {
  public readonly code: string;
  public readonly tenantId?: string;
  public readonly missionId?: string;
  public readonly timestamp: number;

  constructor(message: string, code = 'MISSION_COORDINATION_ERROR', tenantId?: string, missionId?: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.tenantId = tenantId;
    this.missionId = missionId;
    this.timestamp = Date.now();
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class MissionCoordinationValidationError extends MissionCoordinationError {
  constructor(message: string, tenantId?: string, missionId?: string) {
    super(message, 'MISSION_COORDINATION_VALIDATION_ERROR', tenantId, missionId);
  }
}

export class MissionCoordinationAuthorizationError extends MissionCoordinationError {
  constructor(message: string, tenantId?: string, missionId?: string) {
    super(message, 'MISSION_COORDINATION_AUTHORIZATION_ERROR', tenantId, missionId);
  }
}

export class MissionCoordinationTenantIsolationError extends MissionCoordinationError {
  constructor(message: string, tenantId?: string, missionId?: string) {
    super(message, 'MISSION_COORDINATION_TENANT_ISOLATION_ERROR', tenantId, missionId);
  }
}

export class MissionCoordinationSessionIsolationError extends MissionCoordinationError {
  constructor(message: string, tenantId?: string, missionId?: string) {
    super(message, 'MISSION_COORDINATION_SESSION_ISOLATION_ERROR', tenantId, missionId);
  }
}

export class MissionCoordinationScopeViolationError extends MissionCoordinationError {
  constructor(message: string, tenantId?: string, missionId?: string) {
    super(message, 'MISSION_COORDINATION_SCOPE_VIOLATION_ERROR', tenantId, missionId);
  }
}

export class MissionCoordinationLeaseError extends MissionCoordinationError {
  constructor(message: string, tenantId?: string, missionId?: string) {
    super(message, 'MISSION_COORDINATION_LEASE_ERROR', tenantId, missionId);
  }
}

export class MissionCoordinationBudgetError extends MissionCoordinationError {
  constructor(message: string, tenantId?: string, missionId?: string) {
    super(message, 'MISSION_COORDINATION_BUDGET_ERROR', tenantId, missionId);
  }
}

export class MissionCoordinationDependencyError extends MissionCoordinationError {
  constructor(message: string, tenantId?: string, missionId?: string) {
    super(message, 'MISSION_COORDINATION_DEPENDENCY_ERROR', tenantId, missionId);
  }
}

export class MissionCoordinationConflictError extends MissionCoordinationError {
  constructor(message: string, tenantId?: string, missionId?: string) {
    super(message, 'MISSION_COORDINATION_CONFLICT_ERROR', tenantId, missionId);
  }
}

export class MissionCoordinationPriorityError extends MissionCoordinationError {
  constructor(message: string, tenantId?: string, missionId?: string) {
    super(message, 'MISSION_COORDINATION_PRIORITY_ERROR', tenantId, missionId);
  }
}

export class MissionCoordinationConcurrencyError extends MissionCoordinationError {
  constructor(message: string, tenantId?: string, missionId?: string) {
    super(message, 'MISSION_COORDINATION_CONCURRENCY_ERROR', tenantId, missionId);
  }
}

export class MissionCoordinationUserStopError extends MissionCoordinationError {
  constructor(message: string, tenantId?: string, missionId?: string) {
    super(message, 'MISSION_COORDINATION_USER_STOP_ERROR', tenantId, missionId);
  }
}

export class MissionCoordinationEmergencyStopError extends MissionCoordinationError {
  constructor(message: string, tenantId?: string, missionId?: string) {
    super(message, 'MISSION_COORDINATION_EMERGENCY_STOP_ERROR', tenantId, missionId);
  }
}

export class MissionCoordinationPersistenceError extends MissionCoordinationError {
  constructor(message: string, tenantId?: string, missionId?: string) {
    super(message, 'MISSION_COORDINATION_PERSISTENCE_ERROR', tenantId, missionId);
  }
}

export class MissionCoordinationProvenanceError extends MissionCoordinationError {
  constructor(message: string, tenantId?: string, missionId?: string) {
    super(message, 'MISSION_COORDINATION_PROVENANCE_ERROR', tenantId, missionId);
  }
}

export class MissionCoordinationGovernanceError extends MissionCoordinationError {
  constructor(message: string, tenantId?: string, missionId?: string) {
    super(message, 'MISSION_COORDINATION_GOVERNANCE_ERROR', tenantId, missionId);
  }
}

// ============================================================================
// DETERMINISTIC SHA-256 PROVENANCE HELPERS
// ============================================================================

export function deterministicJsonStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map((item) => deterministicJsonStringify(item)).join(',') + ']';
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const pairs = keys.map(
    (key) => `${JSON.stringify(key)}:${deterministicJsonStringify((obj as Record<string, unknown>)[key])}`
  );
  return '{' + pairs.join(',') + '}';
}

export function computeSha256(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

export function computeMissionAuthorizationHash(
  envelope: Omit<MissionAuthorizationEnvelope, 'provenanceHash'>
): string {
  return computeSha256(deterministicJsonStringify(envelope));
}

export function computeObjectiveBindingHash(
  binding: Omit<MissionObjectiveBinding, 'bindingHash'>
): string {
  return computeSha256(deterministicJsonStringify(binding));
}

export function computeObjectiveSelectionHash(selection: {
  missionId: string;
  objectiveId: string;
  cycleNumber: number;
  priorityScore: number;
  timestamp: number;
}): string {
  return computeSha256(deterministicJsonStringify(selection));
}

export function computeCoordinationCycleHash(cycleData: {
  missionId: string;
  cycleNumber: number;
  activeObjectiveId?: string;
  state: MissionState;
  timestamp: number;
}): string {
  return computeSha256(deterministicJsonStringify(cycleData));
}

export function computeMissionSnapshotHash(
  snapshot: Omit<MissionContinuitySnapshot, 'currentSnapshotHash'>
): string {
  return computeSha256(deterministicJsonStringify(snapshot));
}

export function computeMissionProvenanceHash(
  mission: Omit<GovernedMission, 'provenanceHash'>
): string {
  return computeSha256(deterministicJsonStringify(mission));
}

export function computeMissionResultHash(result: Omit<MissionCoordinationResult, 'auditChainHeadHash'>): string {
  return computeSha256(deterministicJsonStringify(result));
}

export function computeMissionAuditHash(auditData: Record<string, unknown>): string {
  return computeSha256(deterministicJsonStringify(auditData));
}
