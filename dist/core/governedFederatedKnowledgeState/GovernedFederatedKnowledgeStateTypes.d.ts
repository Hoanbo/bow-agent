export declare const MAX_KNOWLEDGE_ENTRIES_PER_FEDERATION = 1000;
export declare const MAX_KNOWLEDGE_ENTRIES_PER_AGENT = 200;
export declare const MAX_EVIDENCE_PER_KNOWLEDGE_ENTRY = 20;
export declare const MAX_LINEAGE_DEPTH = 20;
export declare const MAX_KNOWLEDGE_STATE_SIZE = 5000;
export declare const MAX_MERGE_OPERATIONS_PER_STATE = 50;
export declare const MAX_RECONCILIATIONS_PER_STATE = 25;
export declare const MAX_ACTIVE_KNOWLEDGE_STATES = 3;
export declare const MAX_KNOWLEDGE_REASSESSMENTS = 10;
export declare const MAX_CONSECUTIVE_KNOWLEDGE_FAILURES = 3;
export declare const MAX_KNOWLEDGE_STATE_DURATION_MS = 86400000;
export type KnowledgeLifecycleStatus = 'CREATED' | 'VALIDATING' | 'AUTHORIZED' | 'READY' | 'ACTIVE' | 'RECONCILING' | 'MERGING' | 'STABLE' | 'REVIEW_REQUIRED' | 'SUSPENDED' | 'COMPLETED' | 'FAILED' | 'INVALIDATED' | 'HALTED_BY_USER_STOP' | 'HALTED_BY_EMERGENCY_STOP';
export type KnowledgeConflictCategory = 'KNOWLEDGE_CONFLICT' | 'LINEAGE_CONFLICT' | 'VERSION_CONFLICT' | 'AGENT_CONFLICT' | 'AUTHORIZATION_CONFLICT' | 'LEASE_CONFLICT' | 'GENERATION_CONFLICT' | 'POLICY_CONFLICT';
export type KnowledgeDriftCategory = 'KNOWLEDGE_STATE_DRIFT' | 'KNOWLEDGE_ENTRY_DRIFT' | 'EVIDENCE_DRIFT' | 'LINEAGE_DRIFT' | 'MERGE_DRIFT' | 'AUTHORIZATION_DRIFT' | 'LEASE_DRIFT' | 'FEDERATION_DRIFT' | 'POLICY_DRIFT' | 'GENERATION_DRIFT';
export type FederatedKnowledgeCheckpoint = 'KNOWLEDGE_ENTRY' | 'PRE_KNOWLEDGE_REGISTRATION' | 'PRE_KNOWLEDGE_AUTHORIZATION' | 'PRE_LINEAGE_BINDING' | 'PRE_KNOWLEDGE_MERGE' | 'PRE_RECONCILIATION' | 'PRE_CONFLICT_RESOLUTION' | 'PRE_KNOWLEDGE_QUERY' | 'PRE_STATE_UPDATE' | 'PRE_STATE_REASSESSMENT' | 'PRE_CONTINUITY_COMMIT' | 'PRE_PERSISTENCE' | 'POST_PERSISTENCE' | 'POST_STATE_VALIDATION' | 'POST_GOVERNANCE_COMMIT';
export type KnowledgeAuditEventType = 'KNOWLEDGE_ENTRY_CREATED' | 'KNOWLEDGE_ENTRY_AUTHORIZED' | 'KNOWLEDGE_ENTRY_REJECTED' | 'KNOWLEDGE_ENTRY_UPDATED' | 'KNOWLEDGE_ENTRY_EXPIRED' | 'KNOWLEDGE_EVIDENCE_BOUND' | 'KNOWLEDGE_LINEAGE_CREATED' | 'KNOWLEDGE_LINEAGE_VERIFIED' | 'KNOWLEDGE_STATE_CREATED' | 'KNOWLEDGE_STATE_AUTHORIZED' | 'KNOWLEDGE_STATE_READY' | 'KNOWLEDGE_STATE_UPDATED' | 'KNOWLEDGE_MERGE_STARTED' | 'KNOWLEDGE_MERGE_COMPLETED' | 'KNOWLEDGE_MERGE_REJECTED' | 'KNOWLEDGE_RECONCILIATION_STARTED' | 'KNOWLEDGE_RECONCILIATION_COMPLETED' | 'KNOWLEDGE_CONFLICT_DETECTED' | 'KNOWLEDGE_CONFLICT_RESOLVED' | 'KNOWLEDGE_REVIEW_REQUIRED' | 'COLLECTIVE_GOVERNANCE_RECALCULATED' | 'KNOWLEDGE_REASSESSED' | 'KNOWLEDGE_SUSPENDED' | 'KNOWLEDGE_RESUMED' | 'KNOWLEDGE_USER_STOP' | 'KNOWLEDGE_EMERGENCY_STOP' | 'KNOWLEDGE_INVALIDATED' | 'KNOWLEDGE_PERSISTED' | 'KNOWLEDGE_RECOVERED' | 'KNOWLEDGE_DRIFT_DETECTED' | 'KNOWLEDGE_PROVENANCE_VERIFIED' | 'KNOWLEDGE_STATE_COMPLETED';
export interface KnowledgeEvidence {
    readonly evidenceId: string;
    readonly evidenceType: 'OBSERVATION' | 'MEMORY' | 'CONSENSUS_RESULT' | 'EXTERNAL_TELEMETRY';
    readonly sourceId: string;
    readonly sourceAgentId?: string;
    readonly confidence: number;
    readonly generation: number;
    readonly provenanceHash: string;
}
export interface KnowledgeLineageRecord {
    readonly lineageId: string;
    readonly targetKnowledgeId: string;
    readonly parentLineageIds: readonly string[];
    readonly sourceIds: readonly string[];
    readonly sourceTypes: readonly string[];
    readonly sourceGenerations: readonly number[];
    readonly sourceAgentIds: readonly string[];
    readonly depth: number;
    readonly derivationType: 'DIRECT' | 'AGGREGATED' | 'RECONCILED' | 'CONSENSUS_DERIVED';
    readonly timestamp: number;
    readonly provenanceHash: string;
}
export interface GovernedKnowledgeEntry {
    readonly knowledgeId: string;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly humanOperatorId: string;
    readonly missionId: string;
    readonly objectiveId: string;
    readonly federationId: string;
    readonly sourceAgentId: string;
    readonly knowledgeType: string;
    readonly content: string;
    readonly confidence: number;
    readonly evidenceIds: readonly string[];
    readonly lineageId: string;
    readonly generation: number;
    readonly version: number;
    readonly createdAt: number;
    readonly updatedAt: number;
    readonly expiresAt: number;
    readonly authorizationEnvelopeId: string;
    readonly leaseId?: string;
    readonly provenanceHash: string;
}
export interface KnowledgeState {
    readonly stateId: string;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly missionId: string;
    readonly objectiveId: string;
    readonly federationId: string;
    readonly entries: Record<string, GovernedKnowledgeEntry>;
    readonly status: KnowledgeLifecycleStatus;
    readonly generation: number;
    readonly version: number;
    readonly mergeCount: number;
    readonly reconciliationCount: number;
    readonly reassessmentsConsumed: number;
    readonly createdAt: number;
    readonly updatedAt: number;
    readonly expiresAt: number;
    readonly provenanceHash: string;
}
export interface KnowledgeMergeResult {
    readonly mergeId: string;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly targetStateId: string;
    readonly sourceStateIds: readonly string[];
    readonly mergedEntryIds: readonly string[];
    readonly conflictIds: readonly string[];
    readonly status: 'SUCCESS' | 'CONFLICT_DETECTED' | 'REVIEW_REQUIRED';
    readonly timestamp: number;
    readonly provenanceHash: string;
}
export interface KnowledgeReconciliationResult {
    readonly reconciliationId: string;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly entryIds: readonly string[];
    readonly category: KnowledgeConflictCategory;
    readonly resolvable: boolean;
    readonly resolutionStrategy: 'AUTOMATIC_MERGED' | 'REVIEW_REQUIRED' | 'FAIL_CLOSED';
    readonly resolvedContent?: string;
    readonly timestamp: number;
    readonly provenanceHash: string;
}
export interface KnowledgeAuditRecord {
    readonly eventId: string;
    readonly eventType: KnowledgeAuditEventType;
    readonly timestamp: number;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly humanOperatorId: string;
    readonly missionId: string;
    readonly objectiveId: string;
    readonly federationId: string;
    readonly generation: number;
    readonly previousHash: string;
    readonly eventHash: string;
    readonly provenanceHash: string;
    readonly payload: Record<string, unknown>;
}
export declare class GovernedFederatedKnowledgeStateError extends Error {
    readonly tenantId?: string;
    readonly stateId?: string;
    constructor(message: string, tenantId?: string, stateId?: string);
}
export declare class GovernedFederatedKnowledgeStateValidationError extends GovernedFederatedKnowledgeStateError {
    constructor(message: string, tenantId?: string, stateId?: string);
}
export declare class GovernedFederatedKnowledgeStateTenantIsolationError extends GovernedFederatedKnowledgeStateError {
    constructor(message: string, tenantId?: string, stateId?: string);
}
export declare class GovernedFederatedKnowledgeStateSessionIsolationError extends GovernedFederatedKnowledgeStateError {
    constructor(message: string, tenantId?: string, stateId?: string);
}
export declare class GovernedFederatedKnowledgeStateAuthorizationError extends GovernedFederatedKnowledgeStateError {
    constructor(message: string, tenantId?: string, stateId?: string);
}
export declare class GovernedFederatedKnowledgeStateLeaseError extends GovernedFederatedKnowledgeStateError {
    constructor(message: string, tenantId?: string, stateId?: string);
}
export declare class GovernedFederatedKnowledgeStateBudgetError extends GovernedFederatedKnowledgeStateError {
    constructor(message: string, tenantId?: string, stateId?: string);
}
export declare class GovernedFederatedKnowledgeStateConflictError extends GovernedFederatedKnowledgeStateError {
    readonly category?: KnowledgeConflictCategory;
    constructor(message: string, category?: KnowledgeConflictCategory, tenantId?: string, stateId?: string);
}
export declare class GovernedFederatedKnowledgeStateConcurrencyError extends GovernedFederatedKnowledgeStateError {
    constructor(message: string, tenantId?: string, stateId?: string);
}
export declare class GovernedFederatedKnowledgeStateUserStopError extends GovernedFederatedKnowledgeStateError {
    constructor(message: string, tenantId?: string, stateId?: string);
}
export declare class GovernedFederatedKnowledgeStateEmergencyStopError extends GovernedFederatedKnowledgeStateError {
    constructor(message: string, tenantId?: string, stateId?: string);
}
export declare class GovernedFederatedKnowledgeStatePersistenceError extends GovernedFederatedKnowledgeStateError {
    constructor(message: string, tenantId?: string, stateId?: string);
}
export declare class GovernedFederatedKnowledgeStateLineageError extends GovernedFederatedKnowledgeStateError {
    constructor(message: string, tenantId?: string, stateId?: string);
}
export declare class GovernedFederatedKnowledgeStateContinuityError extends GovernedFederatedKnowledgeStateError {
    readonly driftCategory?: KnowledgeDriftCategory;
    constructor(message: string, driftCategory?: KnowledgeDriftCategory, tenantId?: string, stateId?: string);
}
export declare function deterministicJsonStringify(obj: unknown): string;
export declare function computeSha256(input: string): string;
export declare function computeKnowledgeEntryHash(entry: Omit<GovernedKnowledgeEntry, 'provenanceHash'> | GovernedKnowledgeEntry): string;
export declare function computeKnowledgeEvidenceHash(evidence: Omit<KnowledgeEvidence, 'provenanceHash'> | KnowledgeEvidence): string;
export declare function computeKnowledgeLineageHash(lineage: Omit<KnowledgeLineageRecord, 'provenanceHash'> | KnowledgeLineageRecord): string;
export declare function computeKnowledgeMergeHash(merge: Omit<KnowledgeMergeResult, 'provenanceHash'> | KnowledgeMergeResult): string;
export declare function computeKnowledgeReconciliationHash(rec: Omit<KnowledgeReconciliationResult, 'provenanceHash'> | KnowledgeReconciliationResult): string;
export declare function computeKnowledgeStateSnapshotHash(state: Omit<KnowledgeState, 'provenanceHash'> | KnowledgeState): string;
export declare function computeKnowledgeResultHash(result: unknown): string;
export declare function computeKnowledgeAuditHash(audit: Omit<KnowledgeAuditRecord, 'eventHash'> | KnowledgeAuditRecord): string;
