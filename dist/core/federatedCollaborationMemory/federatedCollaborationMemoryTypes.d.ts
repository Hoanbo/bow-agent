export declare const MAX_CONSENSUS_PARTICIPANTS = 8;
export declare const MAX_ACTIVE_CONSENSUS_SESSIONS = 3;
export declare const MAX_CONSENSUS_ROUNDS = 10;
export declare const MAX_CONSENSUS_PROPOSALS = 20;
export declare const MAX_CONSENSUS_DURATION_MS = 3600000;
export declare const MAX_CONSENSUS_REASSESSMENTS = 5;
export declare const MAX_CONSECUTIVE_CONSENSUS_FAILURES = 3;
export declare const MAX_MEMORY_ENTRIES_PER_FEDERATION = 500;
export declare const MAX_MEMORY_ENTRIES_PER_AGENT = 100;
export declare const MAX_CONTEXT_SIZE = 1000;
export declare const MAX_OBSERVATIONS_PER_CONSENSUS = 50;
export declare const MAX_PROPOSALS_PER_CONTEXT = 20;
export type CollaborationContextStatus = 'INITIALIZING' | 'ACTIVE' | 'SUSPENDED' | 'REVIEW_REQUIRED' | 'COMPLETED' | 'FAILED' | 'HALTED_BY_USER_STOP' | 'HALTED_BY_EMERGENCY_STOP' | 'INVALIDATED';
export type ConsensusStatus = 'CREATED' | 'VALIDATING' | 'READY' | 'PROPOSING' | 'VOTING' | 'RECONCILING' | 'CONSENSUS_REACHED' | 'CONSENSUS_REJECTED' | 'REVIEW_REQUIRED' | 'SUSPENDED' | 'RESUMABLE' | 'COMPLETED' | 'FAILED' | 'HALTED_BY_USER_STOP' | 'HALTED_BY_EMERGENCY_STOP' | 'INVALIDATED';
export type ObservationReconciliationStatus = 'CONGRUENT' | 'COMPATIBLE' | 'CONTRADICTORY' | 'STALE' | 'LOW_CONFIDENCE' | 'AUTHORIZATION_INVALID' | 'PROVENANCE_INVALID' | 'REVIEW_REQUIRED';
export type ConsensusConflictCategory = 'OBSERVATION_CONFLICT' | 'MEMORY_CONFLICT' | 'CONTEXT_CONFLICT' | 'AGENT_CONFLICT' | 'AUTHORIZATION_CONFLICT' | 'LEASE_CONFLICT' | 'GENERATION_CONFLICT' | 'POLICY_CONFLICT';
export type CollaborationCheckpoint = 'COLLABORATION_ENTRY' | 'PRE_CONTEXT_REGISTRATION' | 'PRE_AGENT_CONTEXT_ACCESS' | 'PRE_MEMORY_WRITE' | 'PRE_MEMORY_READ' | 'PRE_OBSERVATION_SUBMISSION' | 'PRE_OBSERVATION_RECONCILIATION' | 'PRE_CONSENSUS_CREATION' | 'PRE_CONSENSUS_ROUND' | 'PRE_CONSENSUS_RESULT' | 'PRE_CONTEXT_UPDATE' | 'PRE_CONTINUITY_COMMIT' | 'PRE_PERSISTENCE' | 'POST_PERSISTENCE';
export type CollaborationDriftType = 'CONTEXT_DRIFT' | 'MEMORY_DRIFT' | 'OBSERVATION_DRIFT' | 'CONSENSUS_DRIFT' | 'AGENT_DRIFT' | 'AUTHORIZATION_DRIFT' | 'LEASE_DRIFT' | 'FEDERATION_DRIFT' | 'POLICY_DRIFT' | 'GENERATION_DRIFT';
export type CollaborationAuditEventType = 'COLLABORATION_CONTEXT_CREATED' | 'COLLABORATION_CONTEXT_AUTHORIZED' | 'COLLABORATION_CONTEXT_READY' | 'AGENT_CONTEXT_ACCESS_GRANTED' | 'MEMORY_ENTRY_CREATED' | 'MEMORY_ENTRY_UPDATED' | 'MEMORY_ENTRY_EXPIRED' | 'MEMORY_ENTRY_REJECTED' | 'OBSERVATION_SUBMITTED' | 'OBSERVATION_RECONCILED' | 'OBSERVATION_CONFLICT_DETECTED' | 'CONSENSUS_CREATED' | 'CONSENSUS_PROPOSAL_CREATED' | 'CONSENSUS_VOTE_RECORDED' | 'CONSENSUS_ROUND_COMPLETED' | 'CONSENSUS_REACHED' | 'CONSENSUS_REJECTED' | 'CONSENSUS_CONFLICT_DETECTED' | 'CONSENSUS_CONFLICT_RESOLVED' | 'CONSENSUS_REASSESSED' | 'COLLABORATION_SUSPENDED' | 'COLLABORATION_REVIEW_REQUIRED' | 'COLLABORATION_RESUMED' | 'COLLABORATION_USER_STOP' | 'COLLABORATION_EMERGENCY_STOP' | 'COLLABORATION_INVALIDATED' | 'COLLABORATION_PERSISTED' | 'COLLABORATION_RECOVERED' | 'COLLABORATION_DRIFT_DETECTED' | 'COLLABORATION_PROVENANCE_VERIFIED';
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
export declare class FederatedCollaborationMemoryError extends Error {
    readonly tenantId?: string;
    readonly contextId?: string;
    constructor(message: string, tenantId?: string, contextId?: string);
}
export declare class FederatedCollaborationMemoryValidationError extends FederatedCollaborationMemoryError {
    constructor(message: string, tenantId?: string, contextId?: string);
}
export declare class FederatedCollaborationMemoryTenantIsolationError extends FederatedCollaborationMemoryError {
    constructor(message: string, tenantId?: string, contextId?: string);
}
export declare class FederatedCollaborationMemorySessionIsolationError extends FederatedCollaborationMemoryError {
    constructor(message: string, tenantId?: string, contextId?: string);
}
export declare class FederatedCollaborationMemoryAuthorizationError extends FederatedCollaborationMemoryError {
    constructor(message: string, tenantId?: string, contextId?: string);
}
export declare class FederatedCollaborationMemoryLeaseError extends FederatedCollaborationMemoryError {
    constructor(message: string, tenantId?: string, contextId?: string);
}
export declare class FederatedCollaborationMemoryBudgetError extends FederatedCollaborationMemoryError {
    constructor(message: string, tenantId?: string, contextId?: string);
}
export declare class FederatedCollaborationMemoryConflictError extends FederatedCollaborationMemoryError {
    readonly conflictCategory?: ConsensusConflictCategory;
    constructor(message: string, conflictCategory?: ConsensusConflictCategory, tenantId?: string, contextId?: string);
}
export declare class FederatedCollaborationMemoryTrustError extends FederatedCollaborationMemoryError {
    constructor(message: string, tenantId?: string, contextId?: string);
}
export declare class FederatedCollaborationMemoryConcurrencyError extends FederatedCollaborationMemoryError {
    constructor(message: string, tenantId?: string, contextId?: string);
}
export declare class FederatedCollaborationMemoryUserStopError extends FederatedCollaborationMemoryError {
    constructor(message: string, tenantId?: string, contextId?: string);
}
export declare class FederatedCollaborationMemoryEmergencyStopError extends FederatedCollaborationMemoryError {
    constructor(message: string, tenantId?: string, contextId?: string);
}
export declare class FederatedCollaborationMemoryPersistenceError extends FederatedCollaborationMemoryError {
    constructor(message: string, tenantId?: string, contextId?: string);
}
export declare class FederatedCollaborationMemoryProvenanceError extends FederatedCollaborationMemoryError {
    constructor(message: string, tenantId?: string, contextId?: string);
}
export declare class FederatedCollaborationMemoryContinuityError extends FederatedCollaborationMemoryError {
    readonly driftType?: CollaborationDriftType;
    constructor(message: string, driftType?: CollaborationDriftType, tenantId?: string, contextId?: string);
}
export declare function deterministicJsonStringify(obj: unknown): string;
export declare function computeSha256(input: string): string;
export declare function computeCollaborationContextHash(context: Omit<CollaborationContext, 'provenanceHash'>): string;
export declare function computeMemoryEntryHash(entry: Omit<CollaborationMemoryEntry, 'provenanceHash'>): string;
export declare function computeObservationHash(observation: Omit<AgentObservation, 'provenanceHash'>): string;
export declare function computeObservationReconciliationHash(rec: Omit<ObservationReconciliationRecord, 'provenanceHash'>): string;
export declare function computeConsensusProposalHash(proposal: Omit<ConsensusProposal, 'provenanceHash'>): string;
export declare function computeConsensusResultHash(result: Omit<ConsensusResult, 'provenanceHash'>): string;
export declare function computeCollaborationSnapshotHash(snapshot: Omit<CollaborationSnapshot, 'snapshotHash'>): string;
export declare function computeCollaborationAuditHash(record: Omit<CollaborationAuditRecord, 'eventHash'>): string;
