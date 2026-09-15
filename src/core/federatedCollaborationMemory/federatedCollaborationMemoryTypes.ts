// src/core/federatedCollaborationMemory/federatedCollaborationMemoryTypes.ts
// BOWCON V4.0 — MS-1.5.15: NATIVE GOVERNED FEDERATED COLLABORATION MEMORY, SHARED CONTEXT & CONSENSUS GOVERNANCE ENGINE
// Component 1118 — REAL
//
// EN: Canonical domain types, error taxonomy, lifecycle states, and deterministic provenance helpers
//     for native governed federated collaboration memory, shared context, and consensus.
// VI: Các kiểu miền chuẩn, phân loại lỗi, trạng thái vòng đời, và các hàm băm nguồn gốc xác định
//     cho bộ nhớ hợp tác liên đoàn có quản trị, ngữ cảnh chia sẻ, và đồng thuận tác tử.

import { createHash } from 'crypto';

// ----------------------------------------------------------------------------
// CONSTANTS AND HARD CEILINGS
// ----------------------------------------------------------------------------

export const MAX_CONSENSUS_PARTICIPANTS = 8;
export const MAX_ACTIVE_CONSENSUS_SESSIONS = 3;
export const MAX_CONSENSUS_ROUNDS = 10;
export const MAX_CONSENSUS_PROPOSALS = 20;
export const MAX_CONSENSUS_DURATION_MS = 3600000; // 1 hour
export const MAX_CONSENSUS_REASSESSMENTS = 5;
export const MAX_CONSECUTIVE_CONSENSUS_FAILURES = 3;

export const MAX_MEMORY_ENTRIES_PER_FEDERATION = 500;
export const MAX_MEMORY_ENTRIES_PER_AGENT = 100;
export const MAX_CONTEXT_SIZE = 1000;
export const MAX_OBSERVATIONS_PER_CONSENSUS = 50;
export const MAX_PROPOSALS_PER_CONTEXT = 20;

// ----------------------------------------------------------------------------
// LIFECYCLE & STATUS TYPES
// ----------------------------------------------------------------------------

export type CollaborationContextStatus =
  | 'INITIALIZING'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'REVIEW_REQUIRED'
  | 'COMPLETED'
  | 'FAILED'
  | 'HALTED_BY_USER_STOP'
  | 'HALTED_BY_EMERGENCY_STOP'
  | 'INVALIDATED';

export type ConsensusStatus =
  | 'CREATED'
  | 'VALIDATING'
  | 'READY'
  | 'PROPOSING'
  | 'VOTING'
  | 'RECONCILING'
  | 'CONSENSUS_REACHED'
  | 'CONSENSUS_REJECTED'
  | 'REVIEW_REQUIRED'
  | 'SUSPENDED'
  | 'RESUMABLE'
  | 'COMPLETED'
  | 'FAILED'
  | 'HALTED_BY_USER_STOP'
  | 'HALTED_BY_EMERGENCY_STOP'
  | 'INVALIDATED';

export type ObservationReconciliationStatus =
  | 'CONGRUENT'
  | 'COMPATIBLE'
  | 'CONTRADICTORY'
  | 'STALE'
  | 'LOW_CONFIDENCE'
  | 'AUTHORIZATION_INVALID'
  | 'PROVENANCE_INVALID'
  | 'REVIEW_REQUIRED';

export type ConsensusConflictCategory =
  | 'OBSERVATION_CONFLICT'
  | 'MEMORY_CONFLICT'
  | 'CONTEXT_CONFLICT'
  | 'AGENT_CONFLICT'
  | 'AUTHORIZATION_CONFLICT'
  | 'LEASE_CONFLICT'
  | 'GENERATION_CONFLICT'
  | 'POLICY_CONFLICT';

export type CollaborationCheckpoint =
  | 'COLLABORATION_ENTRY'
  | 'PRE_CONTEXT_REGISTRATION'
  | 'PRE_AGENT_CONTEXT_ACCESS'
  | 'PRE_MEMORY_WRITE'
  | 'PRE_MEMORY_READ'
  | 'PRE_OBSERVATION_SUBMISSION'
  | 'PRE_OBSERVATION_RECONCILIATION'
  | 'PRE_CONSENSUS_CREATION'
  | 'PRE_CONSENSUS_ROUND'
  | 'PRE_CONSENSUS_RESULT'
  | 'PRE_CONTEXT_UPDATE'
  | 'PRE_CONTINUITY_COMMIT'
  | 'PRE_PERSISTENCE'
  | 'POST_PERSISTENCE';

export type CollaborationDriftType =
  | 'CONTEXT_DRIFT'
  | 'MEMORY_DRIFT'
  | 'OBSERVATION_DRIFT'
  | 'CONSENSUS_DRIFT'
  | 'AGENT_DRIFT'
  | 'AUTHORIZATION_DRIFT'
  | 'LEASE_DRIFT'
  | 'FEDERATION_DRIFT'
  | 'POLICY_DRIFT'
  | 'GENERATION_DRIFT';

// ----------------------------------------------------------------------------
// STRUCTURED AUDIT EVENT TYPES (EXACTLY 30 TYPES)
// ----------------------------------------------------------------------------

export type CollaborationAuditEventType =
  | 'COLLABORATION_CONTEXT_CREATED'
  | 'COLLABORATION_CONTEXT_AUTHORIZED'
  | 'COLLABORATION_CONTEXT_READY'
  | 'AGENT_CONTEXT_ACCESS_GRANTED'
  | 'MEMORY_ENTRY_CREATED'
  | 'MEMORY_ENTRY_UPDATED'
  | 'MEMORY_ENTRY_EXPIRED'
  | 'MEMORY_ENTRY_REJECTED'
  | 'OBSERVATION_SUBMITTED'
  | 'OBSERVATION_RECONCILED'
  | 'OBSERVATION_CONFLICT_DETECTED'
  | 'CONSENSUS_CREATED'
  | 'CONSENSUS_PROPOSAL_CREATED'
  | 'CONSENSUS_VOTE_RECORDED'
  | 'CONSENSUS_ROUND_COMPLETED'
  | 'CONSENSUS_REACHED'
  | 'CONSENSUS_REJECTED'
  | 'CONSENSUS_CONFLICT_DETECTED'
  | 'CONSENSUS_CONFLICT_RESOLVED'
  | 'CONSENSUS_REASSESSED'
  | 'COLLABORATION_SUSPENDED'
  | 'COLLABORATION_REVIEW_REQUIRED'
  | 'COLLABORATION_RESUMED'
  | 'COLLABORATION_USER_STOP'
  | 'COLLABORATION_EMERGENCY_STOP'
  | 'COLLABORATION_INVALIDATED'
  | 'COLLABORATION_PERSISTED'
  | 'COLLABORATION_RECOVERED'
  | 'COLLABORATION_DRIFT_DETECTED'
  | 'COLLABORATION_PROVENANCE_VERIFIED';

// ----------------------------------------------------------------------------
// CORE INTERFACES
// ----------------------------------------------------------------------------

export interface CollaborationAuthorizationBinding {
  readonly envelopeId: string;
  readonly scope: readonly string[];
  readonly expiresAt: number;
}

export interface CollaborationLeaseBinding {
  readonly leaseId: string;
  readonly expiresAt: number;
}

export interface CollaborationContext {
  readonly contextId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly missionId: string;
  readonly objectiveId: string;
  readonly federationId: string;
  readonly participatingAgentIds: readonly string[];
  readonly leaderAgentId: string;
  readonly generation: number;
  readonly authorizationBinding: CollaborationAuthorizationBinding;
  readonly leaseBinding?: CollaborationLeaseBinding;
  readonly status: CollaborationContextStatus;
  readonly metadata: Record<string, unknown>;
  readonly version: number;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly provenanceHash: string;
}

export interface CollaborationMemoryEntry {
  readonly memoryId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly missionId: string;
  readonly objectiveId: string;
  readonly federationId: string;
  readonly agentId: string;
  readonly generation: number;
  readonly memoryType: string;
  readonly content: string;
  readonly confidence: number;
  readonly version: number;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly provenanceHash: string;
}

export interface AgentObservation {
  readonly observationId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly missionId: string;
  readonly objectiveId: string;
  readonly federationId: string;
  readonly agentId: string;
  readonly generation: number;
  readonly observationType: string;
  readonly target: string;
  readonly observedValue: string;
  readonly confidence: number;
  readonly timestamp: number;
  readonly provenanceHash: string;
}

export interface ObservationReconciliationRecord {
  readonly reconciliationId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly federationId: string;
  readonly observationIds: readonly string[];
  readonly target: string;
  readonly status: ObservationReconciliationStatus;
  readonly resolvedValue?: string;
  readonly confidence: number;
  readonly conflictCategory?: ConsensusConflictCategory;
  readonly resolvedAt: number;
  readonly provenanceHash: string;
}

export interface ConsensusProposal {
  readonly proposalId: string;
  readonly contextId: string;
  readonly federationId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly proposingAgentId: string;
  readonly generation: number;
  readonly proposalType: string;
  readonly payload: Record<string, unknown>;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  readonly provenanceHash: string;
}

export interface ConsensusVote {
  readonly voteId: string;
  readonly proposalId: string;
  readonly agentId: string;
  readonly decision: 'APPROVE' | 'REJECT' | 'ABSTAIN';
  readonly rationale: string;
  readonly confidence: number;
  readonly timestamp: number;
  readonly signatureHash: string;
}

export interface ConsensusResult {
  readonly consensusId: string;
  readonly federationId: string;
  readonly contextId: string;
  readonly proposalId: string;
  readonly status: ConsensusStatus;
  readonly votes: readonly ConsensusVote[];
  readonly quorum: number;
  readonly confidence: number;
  readonly dissentingAgents: readonly string[];
  readonly generation: number;
  readonly authorizationBinding: CollaborationAuthorizationBinding;
  readonly leaseBinding?: CollaborationLeaseBinding;
  readonly roundsConsumed: number;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly provenanceHash: string;
}

export interface CollaborationSnapshot {
  readonly snapshotId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly federationId: string;
  readonly contextId: string;
  readonly contextVersion: number;
  readonly activeAgentIds: readonly string[];
  readonly memoryCount: number;
  readonly consensusCount: number;
  readonly generation: number;
  readonly timestamp: number;
  readonly previousSnapshotHash?: string;
  readonly snapshotHash: string;
}

export interface CollaborationAuditRecord {
  readonly eventId: string;
  readonly eventType: CollaborationAuditEventType;
  readonly timestamp: number;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly missionId: string;
  readonly objectiveId: string;
  readonly federationId: string;
  readonly agentId?: string;
  readonly generation: number;
  readonly previousHash: string;
  readonly eventHash: string;
  readonly payload: Record<string, unknown>;
}

// ----------------------------------------------------------------------------
// TYPED ERRORS
// ----------------------------------------------------------------------------

export class FederatedCollaborationMemoryError extends Error {
  public readonly tenantId?: string;
  public readonly contextId?: string;

  constructor(message: string, tenantId?: string, contextId?: string) {
    super(message);
    this.name = 'FederatedCollaborationMemoryError';
    this.tenantId = tenantId;
    this.contextId = contextId;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class FederatedCollaborationMemoryValidationError extends FederatedCollaborationMemoryError {
  constructor(message: string, tenantId?: string, contextId?: string) {
    super(message, tenantId, contextId);
    this.name = 'FederatedCollaborationMemoryValidationError';
  }
}

export class FederatedCollaborationMemoryTenantIsolationError extends FederatedCollaborationMemoryError {
  constructor(message: string, tenantId?: string, contextId?: string) {
    super(message, tenantId, contextId);
    this.name = 'FederatedCollaborationMemoryTenantIsolationError';
  }
}

export class FederatedCollaborationMemorySessionIsolationError extends FederatedCollaborationMemoryError {
  constructor(message: string, tenantId?: string, contextId?: string) {
    super(message, tenantId, contextId);
    this.name = 'FederatedCollaborationMemorySessionIsolationError';
  }
}

export class FederatedCollaborationMemoryAuthorizationError extends FederatedCollaborationMemoryError {
  constructor(message: string, tenantId?: string, contextId?: string) {
    super(message, tenantId, contextId);
    this.name = 'FederatedCollaborationMemoryAuthorizationError';
  }
}

export class FederatedCollaborationMemoryLeaseError extends FederatedCollaborationMemoryError {
  constructor(message: string, tenantId?: string, contextId?: string) {
    super(message, tenantId, contextId);
    this.name = 'FederatedCollaborationMemoryLeaseError';
  }
}

export class FederatedCollaborationMemoryBudgetError extends FederatedCollaborationMemoryError {
  constructor(message: string, tenantId?: string, contextId?: string) {
    super(message, tenantId, contextId);
    this.name = 'FederatedCollaborationMemoryBudgetError';
  }
}

export class FederatedCollaborationMemoryConflictError extends FederatedCollaborationMemoryError {
  public readonly conflictCategory?: ConsensusConflictCategory;

  constructor(message: string, conflictCategory?: ConsensusConflictCategory, tenantId?: string, contextId?: string) {
    super(message, tenantId, contextId);
    this.name = 'FederatedCollaborationMemoryConflictError';
    this.conflictCategory = conflictCategory;
  }
}

export class FederatedCollaborationMemoryTrustError extends FederatedCollaborationMemoryError {
  constructor(message: string, tenantId?: string, contextId?: string) {
    super(message, tenantId, contextId);
    this.name = 'FederatedCollaborationMemoryTrustError';
  }
}

export class FederatedCollaborationMemoryConcurrencyError extends FederatedCollaborationMemoryError {
  constructor(message: string, tenantId?: string, contextId?: string) {
    super(message, tenantId, contextId);
    this.name = 'FederatedCollaborationMemoryConcurrencyError';
  }
}

export class FederatedCollaborationMemoryUserStopError extends FederatedCollaborationMemoryError {
  constructor(message: string, tenantId?: string, contextId?: string) {
    super(message, tenantId, contextId);
    this.name = 'FederatedCollaborationMemoryUserStopError';
  }
}

export class FederatedCollaborationMemoryEmergencyStopError extends FederatedCollaborationMemoryError {
  constructor(message: string, tenantId?: string, contextId?: string) {
    super(message, tenantId, contextId);
    this.name = 'FederatedCollaborationMemoryEmergencyStopError';
  }
}

export class FederatedCollaborationMemoryPersistenceError extends FederatedCollaborationMemoryError {
  constructor(message: string, tenantId?: string, contextId?: string) {
    super(message, tenantId, contextId);
    this.name = 'FederatedCollaborationMemoryPersistenceError';
  }
}

export class FederatedCollaborationMemoryProvenanceError extends FederatedCollaborationMemoryError {
  constructor(message: string, tenantId?: string, contextId?: string) {
    super(message, tenantId, contextId);
    this.name = 'FederatedCollaborationMemoryProvenanceError';
  }
}

export class FederatedCollaborationMemoryContinuityError extends FederatedCollaborationMemoryError {
  public readonly driftType?: CollaborationDriftType;

  constructor(message: string, driftType?: CollaborationDriftType, tenantId?: string, contextId?: string) {
    super(message, tenantId, contextId);
    this.name = 'FederatedCollaborationMemoryContinuityError';
    this.driftType = driftType;
  }
}

// ----------------------------------------------------------------------------
// DETERMINISTIC CANONICAL JSON STRINGIFY & SHA-256 HASHERS
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

export function computeCollaborationContextHash(context: Omit<CollaborationContext, 'provenanceHash'>): string {
  return computeSha256(`collab_context:${deterministicJsonStringify(context)}`);
}

export function computeMemoryEntryHash(entry: Omit<CollaborationMemoryEntry, 'provenanceHash'>): string {
  return computeSha256(`memory_entry:${deterministicJsonStringify(entry)}`);
}

export function computeObservationHash(observation: Omit<AgentObservation, 'provenanceHash'>): string {
  return computeSha256(`observation:${deterministicJsonStringify(observation)}`);
}

export function computeObservationReconciliationHash(
  rec: Omit<ObservationReconciliationRecord, 'provenanceHash'>
): string {
  return computeSha256(`observation_reconciliation:${deterministicJsonStringify(rec)}`);
}

export function computeConsensusProposalHash(proposal: Omit<ConsensusProposal, 'provenanceHash'>): string {
  return computeSha256(`consensus_proposal:${deterministicJsonStringify(proposal)}`);
}

export function computeConsensusResultHash(result: Omit<ConsensusResult, 'provenanceHash'>): string {
  return computeSha256(`consensus_result:${deterministicJsonStringify(result)}`);
}

export function computeCollaborationSnapshotHash(snapshot: Omit<CollaborationSnapshot, 'snapshotHash'>): string {
  return computeSha256(`collab_snapshot:${deterministicJsonStringify(snapshot)}`);
}

export function computeCollaborationAuditHash(
  record: Omit<CollaborationAuditRecord, 'eventHash'>
): string {
  return computeSha256(`collab_audit:${deterministicJsonStringify(record)}`);
}
