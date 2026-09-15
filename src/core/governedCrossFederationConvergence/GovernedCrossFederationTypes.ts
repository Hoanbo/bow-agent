// src/core/governedCrossFederationConvergence/GovernedCrossFederationTypes.ts
// BOWCON V4.0 — MS-1.5.17: GOVERNED CROSS-FEDERATION STRATEGY, CONVERGENCE & POLICY META-GOVERNANCE ENGINE
// Component 1138 — REAL
//
// EN: Canonical ontology, error taxonomy, lifecycle states, and deterministic SHA-256 provenance hashers
//     for governed cross-federation strategy, convergence, and policy meta-governance.
// VI: Bản thể học chuẩn, phân loại lỗi, trạng thái vòng đời, và các hàm băm nguồn gốc xác định SHA-256
//     cho chiến lược liên đoàn chéo có quản trị, hội tụ và siêu quản trị chính sách.

import { createHash } from 'crypto';

// ----------------------------------------------------------------------------
// HARD CEILINGS & BOUNDS
// ----------------------------------------------------------------------------

export const MAX_ACTIVE_FEDERATIONS_PER_CONVERGENCE = 5;
export const MAX_STRATEGY_PROPOSALS_PER_CONVERGENCE = 50;
export const MAX_CONVERGENCE_ROUNDS = 10;
export const MAX_PARTICIPATING_AGENTS_TOTAL = 40;
export const MAX_INTER_FEDERATION_DEPENDENCY_DEPTH = 10;
export const MAX_CROSS_FEDERATION_STATE_SIZE = 10000;
export const MAX_ACTIVE_CONVERGENCE_SESSIONS = 3;
export const MAX_CONVERGENCE_REASSESSMENTS = 5;
export const MAX_CONSECUTIVE_CONVERGENCE_FAILURES = 3;
export const MAX_CONVERGENCE_DURATION_MS = 86400000; // 24 hours
export const MAX_AUDIT_LOG_RECORDS_PER_SESSION = 2000;

// ----------------------------------------------------------------------------
// LIFECYCLE & STATUS TYPES
// ----------------------------------------------------------------------------

export type CrossFederationLifecycleStatus =
  | 'CREATED'
  | 'VALIDATING'
  | 'AUTHORIZED'
  | 'STRATEGY_ALIGNING'
  | 'RECONCILING'
  | 'CONVERGING'
  | 'STABLE'
  | 'REVIEW_REQUIRED'
  | 'SUSPENDED'
  | 'COMPLETED'
  | 'FAILED'
  | 'INVALIDATED'
  | 'HALTED_BY_USER_STOP'
  | 'HALTED_BY_EMERGENCY_STOP';

// Exactly 8 canonical conflict categories
export type CrossFederationConflictCategory =
  | 'CROSS_FEDERATION_KNOWLEDGE_CONFLICT'
  | 'STRATEGY_CONFLICT'
  | 'CONVERGENCE_CONFLICT'
  | 'LINEAGE_CONFLICT'
  | 'VERSION_CONFLICT'
  | 'AUTHORIZATION_CONFLICT'
  | 'LEASE_CONFLICT'
  | 'POLICY_CONFLICT';

// Exactly 10 canonical drift categories
export type CrossFederationDriftCategory =
  | 'CONVERGENCE_STATE_DRIFT'
  | 'STRATEGY_ALIGNMENT_DRIFT'
  | 'FEDERATION_MEMBERSHIP_DRIFT'
  | 'DEPENDENCY_GRAPH_DRIFT'
  | 'RECONCILIATION_DRIFT'
  | 'POLICY_META_DRIFT'
  | 'LEASE_INVARIANT_DRIFT'
  | 'GENERATION_DRIFT'
  | 'PROVENANCE_HASH_DRIFT'
  | 'CONTINUITY_SNAPSHOT_DRIFT';

// Exactly 16 critical checkpoints
export type CrossFederationCheckpoint =
  | 'CROSS_FED_ENTRY'
  | 'PRE_CROSS_FED_REGISTRATION'
  | 'PRE_CROSS_FED_AUTHORIZATION'
  | 'PRE_STRATEGY_BINDING'
  | 'PRE_CONVERGENCE'
  | 'PRE_RECONCILIATION'
  | 'PRE_CONFLICT_RESOLUTION'
  | 'PRE_POLICY_META_GOVERNANCE'
  | 'PRE_CROSS_FED_QUERY'
  | 'PRE_STATE_UPDATE'
  | 'PRE_CONVERGENCE_REASSESSMENT'
  | 'PRE_CONTINUITY_COMMIT'
  | 'PRE_PERSISTENCE'
  | 'POST_PERSISTENCE'
  | 'POST_STATE_VALIDATION'
  | 'POST_META_GOVERNANCE_COMMIT';

// Exactly 34 structured audit event types
export type CrossFederationAuditEventType =
  | 'CROSS_FED_SESSION_CREATED'
  | 'CROSS_FED_FEDERATION_REGISTERED'
  | 'CROSS_FED_FEDERATION_DEREGISTERED'
  | 'CROSS_FED_PROPOSAL_SUBMITTED'
  | 'CROSS_FED_PROPOSAL_VALIDATED'
  | 'CROSS_FED_PROPOSAL_REJECTED'
  | 'CROSS_FED_ALIGNMENT_STARTED'
  | 'CROSS_FED_ALIGNMENT_COMPLETED'
  | 'CROSS_FED_DEPENDENCY_BOUND'
  | 'CROSS_FED_DEPENDENCY_CYCLE_REJECTED'
  | 'CROSS_FED_RECONCILIATION_STARTED'
  | 'CROSS_FED_RECONCILIATION_COMPLETED'
  | 'CROSS_FED_CONFLICT_DETECTED'
  | 'CROSS_FED_CONFLICT_RESOLVED'
  | 'CROSS_FED_REVIEW_REQUIRED'
  | 'CROSS_FED_POLICY_META_EVALUATED'
  | 'CROSS_FED_POLICY_VIOLATION_BLOCKED'
  | 'CROSS_FED_LEASE_VERIFIED'
  | 'CROSS_FED_LEASE_EXPIRED_SUSPENDED'
  | 'CROSS_FED_ROUND_STARTED'
  | 'CROSS_FED_ROUND_COMPLETED'
  | 'CROSS_FED_CONVERGENCE_STABILIZED'
  | 'CROSS_FED_CONVERGENCE_COMPLETED'
  | 'CROSS_FED_REASSESSED'
  | 'CROSS_FED_SUSPENDED'
  | 'CROSS_FED_RESUMED'
  | 'CROSS_FED_USER_STOP'
  | 'CROSS_FED_EMERGENCY_STOP'
  | 'CROSS_FED_INVALIDATED'
  | 'CROSS_FED_STATE_PERSISTED'
  | 'CROSS_FED_STATE_RECOVERED'
  | 'CROSS_FED_DRIFT_DETECTED'
  | 'CROSS_FED_PROVENANCE_VERIFIED'
  | 'CROSS_FED_SECURITY_QUARANTINE';

// ----------------------------------------------------------------------------
// CORE ENTITIES & INTERFACES
// ----------------------------------------------------------------------------

export interface InterFederationDependency {
  readonly dependencyId: string;
  readonly sourceFederationId: string;
  readonly targetFederationId: string;
  readonly requiredStateHash: string;
  readonly dependencyType: 'SEQUENTIAL' | 'INFORMATIONAL' | 'COORDINATED_BARRIER';
  readonly depth: number;
}

export interface CrossFederationStrategyProposal {
  readonly proposalId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly federationId: string;
  readonly authorAgentId: string;
  readonly missionId: string;
  readonly objectiveId: string;
  readonly strategicGoal: string;
  readonly plannedActions: readonly string[];
  readonly dependencies: readonly InterFederationDependency[];
  readonly estimatedResourceCost: number;
  readonly priority: number;
  readonly generation: number;
  readonly authorizationEnvelopeId: string;
  readonly leaseId: string;
  readonly createdAt: number;
  readonly provenanceHash: string;
}

export interface CrossFederationReconciliationResult {
  readonly reconciliationId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly reconciledFederationIds: readonly string[];
  readonly congruentProposals: readonly string[];
  readonly contradictedProposals: readonly string[];
  readonly status: 'CONGRUENT' | 'MATERIAL_CONTRADICTION' | 'REVIEW_REQUIRED';
  readonly timestamp: number;
  readonly provenanceHash: string;
}

export interface CrossFederationConflictRecord {
  readonly conflictId: string;
  readonly category: CrossFederationConflictCategory;
  readonly participatingFederationIds: readonly string[];
  readonly description: string;
  readonly resolvable: boolean;
  readonly resolutionVerdict?: 'HUMAN_DIRECTIVE_APPLIED' | 'DETERMINISTIC_MERGE' | 'REVIEW_REQUIRED';
  readonly timestamp: number;
  readonly provenanceHash: string;
}

export interface PolicyMetaEvaluation {
  readonly evaluationId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly evaluatedStrategyHash: string;
  readonly policyRuleIds: readonly string[];
  readonly compliant: boolean;
  readonly violationReason?: string;
  readonly timestamp: number;
  readonly provenanceHash: string;
}

export interface CrossFederationConvergenceState {
  readonly stateId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly missionId: string;
  readonly objectiveId: string;
  readonly participatingFederationIds: readonly string[];
  readonly proposals: Record<string, CrossFederationStrategyProposal>;
  readonly dependencyGraph: readonly InterFederationDependency[];
  readonly status: CrossFederationLifecycleStatus;
  readonly round: number;
  readonly generation: number;
  readonly version: number;
  readonly reassessmentsConsumed: number;
  readonly consecutiveFailures: number;
  readonly convergedStrategyHash?: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly expiresAt: number;
  readonly provenanceHash: string;
}

export interface CrossFederationContinuitySnapshot {
  readonly snapshotId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly convergenceStateId: string;
  readonly generation: number;
  readonly version: number;
  readonly activeFederationIds: readonly string[];
  readonly convergedStrategyHash: string;
  readonly dependencyGraphHash: string;
  readonly previousSnapshotHash: string;
  readonly snapshotHash: string;
  readonly timestamp: number;
}

export interface CrossFederationAuditRecord {
  readonly eventId: string;
  readonly eventType: CrossFederationAuditEventType;
  readonly timestamp: number;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly humanOperatorId: string;
  readonly missionId: string;
  readonly participatingFederationIds: readonly string[];
  readonly generation: number;
  readonly previousHash: string;
  readonly eventHash: string;
  readonly provenanceHash: string;
  readonly payload: Record<string, unknown>;
}

// ----------------------------------------------------------------------------
// TYPED ERRORS
// ----------------------------------------------------------------------------

export class GovernedCrossFederationError extends Error {
  public readonly tenantId?: string;
  public readonly sessionId?: string;

  constructor(message: string, tenantId?: string, sessionId?: string) {
    super(message);
    this.name = 'GovernedCrossFederationError';
    this.tenantId = tenantId;
    this.sessionId = sessionId;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class GovernedCrossFederationValidationError extends GovernedCrossFederationError {
  constructor(message: string, tenantId?: string, sessionId?: string) {
    super(message, tenantId, sessionId);
    this.name = 'GovernedCrossFederationValidationError';
  }
}

export class GovernedCrossFederationTenantIsolationError extends GovernedCrossFederationError {
  constructor(message: string, tenantId?: string, sessionId?: string) {
    super(message, tenantId, sessionId);
    this.name = 'GovernedCrossFederationTenantIsolationError';
  }
}

export class GovernedCrossFederationSessionIsolationError extends GovernedCrossFederationError {
  constructor(message: string, tenantId?: string, sessionId?: string) {
    super(message, tenantId, sessionId);
    this.name = 'GovernedCrossFederationSessionIsolationError';
  }
}

export class GovernedCrossFederationAuthorizationError extends GovernedCrossFederationError {
  constructor(message: string, tenantId?: string, sessionId?: string) {
    super(message, tenantId, sessionId);
    this.name = 'GovernedCrossFederationAuthorizationError';
  }
}

export class GovernedCrossFederationLeaseError extends GovernedCrossFederationError {
  constructor(message: string, tenantId?: string, sessionId?: string) {
    super(message, tenantId, sessionId);
    this.name = 'GovernedCrossFederationLeaseError';
  }
}

export class GovernedCrossFederationBudgetError extends GovernedCrossFederationError {
  constructor(message: string, tenantId?: string, sessionId?: string) {
    super(message, tenantId, sessionId);
    this.name = 'GovernedCrossFederationBudgetError';
  }
}

export class GovernedCrossFederationLifecycleError extends GovernedCrossFederationError {
  constructor(message: string, tenantId?: string, sessionId?: string) {
    super(message, tenantId, sessionId);
    this.name = 'GovernedCrossFederationLifecycleError';
  }
}

export class GovernedCrossFederationConflictError extends GovernedCrossFederationError {
  public readonly category?: CrossFederationConflictCategory;

  constructor(message: string, category?: CrossFederationConflictCategory, tenantId?: string, sessionId?: string) {
    super(message, tenantId, sessionId);
    this.name = 'GovernedCrossFederationConflictError';
    this.category = category;
  }
}

export class GovernedCrossFederationPolicyError extends GovernedCrossFederationError {
  constructor(message: string, tenantId?: string, sessionId?: string) {
    super(message, tenantId, sessionId);
    this.name = 'GovernedCrossFederationPolicyError';
  }
}

export class GovernedCrossFederationConcurrencyError extends GovernedCrossFederationError {
  constructor(message: string, tenantId?: string, sessionId?: string) {
    super(message, tenantId, sessionId);
    this.name = 'GovernedCrossFederationConcurrencyError';
  }
}

export class GovernedCrossFederationUserStopError extends GovernedCrossFederationError {
  constructor(message: string, tenantId?: string, sessionId?: string) {
    super(message, tenantId, sessionId);
    this.name = 'GovernedCrossFederationUserStopError';
  }
}

export class GovernedCrossFederationEmergencyStopError extends GovernedCrossFederationError {
  constructor(message: string, tenantId?: string, sessionId?: string) {
    super(message, tenantId, sessionId);
    this.name = 'GovernedCrossFederationEmergencyStopError';
  }
}

export class GovernedCrossFederationPersistenceError extends GovernedCrossFederationError {
  constructor(message: string, tenantId?: string, sessionId?: string) {
    super(message, tenantId, sessionId);
    this.name = 'GovernedCrossFederationPersistenceError';
  }
}

export class GovernedCrossFederationContinuityError extends GovernedCrossFederationError {
  public readonly driftCategory?: CrossFederationDriftCategory;

  constructor(message: string, driftCategory?: CrossFederationDriftCategory, tenantId?: string, sessionId?: string) {
    super(message, tenantId, sessionId);
    this.name = 'GovernedCrossFederationContinuityError';
    this.driftCategory = driftCategory;
  }
}

// ----------------------------------------------------------------------------
// DETERMINISTIC SERIALIZATION & SHA-256 HASHING
// ----------------------------------------------------------------------------

export function deterministicJsonStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map((item) => deterministicJsonStringify(item)).join(',') + ']';
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const pairs = keys.map(
    (k) => JSON.stringify(k) + ':' + deterministicJsonStringify((obj as Record<string, unknown>)[k])
  );
  return '{' + pairs.join(',') + '}';
}

export function computeSha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

export function computeCrossFederationStrategyHash(
  strategy: Omit<CrossFederationStrategyProposal, 'provenanceHash'> | CrossFederationStrategyProposal
): string {
  const { provenanceHash: _h, ...clean } = strategy as any;
  return computeSha256(`cross_fed_strategy:${deterministicJsonStringify(clean)}`);
}

export function computeConvergenceProposalHash(
  proposal: Omit<CrossFederationStrategyProposal, 'provenanceHash'> | CrossFederationStrategyProposal
): string {
  const { provenanceHash: _h, ...clean } = proposal as any;
  return computeSha256(`convergence_proposal:${deterministicJsonStringify(clean)}`);
}

export function computeConvergenceRoundHash(roundData: unknown): string {
  return computeSha256(`convergence_round:${deterministicJsonStringify(roundData)}`);
}

export function computeCrossReconciliationHash(
  rec: Omit<CrossFederationReconciliationResult, 'provenanceHash'> | CrossFederationReconciliationResult
): string {
  const { provenanceHash: _h, ...clean } = rec as any;
  return computeSha256(`cross_reconciliation:${deterministicJsonStringify(clean)}`);
}

export function computePolicyMetaEvaluationHash(
  evaluation: Omit<PolicyMetaEvaluation, 'provenanceHash'> | PolicyMetaEvaluation
): string {
  const { provenanceHash: _h, ...clean } = evaluation as any;
  return computeSha256(`policy_meta:${deterministicJsonStringify(clean)}`);
}

export function computeConvergenceStateSnapshotHash(
  state: Omit<CrossFederationConvergenceState, 'provenanceHash'> | CrossFederationConvergenceState
): string {
  const { provenanceHash: _h, ...clean } = state as any;
  return computeSha256(`convergence_state:${deterministicJsonStringify(clean)}`);
}

export function computeConvergenceResultHash(result: unknown): string {
  return computeSha256(`convergence_result:${deterministicJsonStringify(result)}`);
}

export function computeConvergenceAuditHash(
  audit: Omit<CrossFederationAuditRecord, 'eventHash'> | CrossFederationAuditRecord
): string {
  const { eventHash: _h, ...clean } = audit as any;
  return computeSha256(`convergence_audit:${deterministicJsonStringify(clean)}`);
}
