export declare const STRATEGIC_MEMORY_GOVERNANCE_INVARIANTS: {
    readonly AGENT_CAPABILITY_NOT_HUMAN_AUTHORITY: "AGENT_CAPABILITY != HUMAN_AUTHORITY";
    readonly KNOWLEDGE_NOT_AUTHORIZATION: "KNOWLEDGE != AUTHORIZATION";
    readonly CONSENSUS_NOT_AUTHORIZATION: "CONSENSUS != AUTHORIZATION";
    readonly CONFIDENCE_NOT_AUTHORITY: "CONFIDENCE != AUTHORITY";
    readonly AGREEMENT_NOT_HUMAN_APPROVAL: "AGREEMENT != HUMAN_APPROVAL";
    readonly STATE_NOT_PRIVILEGE: "STATE != PRIVILEGE";
    readonly PERSISTENCE_NOT_EXECUTION: "PERSISTENCE != EXECUTION";
    readonly STRATEGIC_MEMORY_NOT_EXECUTION_PERMISSION: "STRATEGIC_MEMORY != EXECUTION_PERMISSION";
    readonly LEARNED_POLICY_NOT_AUTHORIZATION: "LEARNED_POLICY != AUTHORIZATION";
    readonly COLLECTIVE_INTELLIGENCE_NOT_HUMAN_GOVERNANCE: "COLLECTIVE_INTELLIGENCE != HUMAN_GOVERNANCE";
    readonly MS_1518_NOT_AUTONOMY_LEASE_AUTHORITY: "MS-1.5.18 != AUTONOMY_LEASE_AUTHORITY";
    readonly MS_1518_NOT_DIRECT_EXECUTION: "MS-1.5.18 != DIRECT_EXECUTION";
};
export declare const MAX_STRATEGIC_MEMORY_RECORDS_PER_TENANT = 1000;
export declare const MAX_ACTIVE_INSTITUTIONAL_SESSIONS = 3;
export declare const MAX_RETRIEVAL_RESULTS_PER_QUERY = 20;
export declare const MAX_LINEAGE_DEPTH = 10;
export declare const MAX_SYNTHESIS_RECORDS_PER_ROUND = 50;
export declare const MAX_META_LEARNING_ROUNDS_PER_SESSION = 5;
export declare const MAX_STRATEGIC_MEMORY_SIZE_BYTES = 10485760;
export declare const MAX_CONCURRENT_RETRIEVAL_OPERATIONS = 5;
export declare const MAX_CONSECUTIVE_DRIFT_FAILURES = 3;
export declare const MAX_SESSION_DURATION_MS = 86400000;
export declare const MAX_AUDIT_LOG_RECORDS_PER_SESSION = 2000;
export type StrategicMemoryLifecycleStatus = 'CREATED' | 'VALIDATING' | 'ADMITTED' | 'INDEXING' | 'INDEXED' | 'SYNTHESIZING' | 'RETRIEVING' | 'META_LEARNING' | 'DRIFT_ANALYSIS' | 'REVIEW_REQUIRED' | 'STABLE' | 'SUSPENDED' | 'COMPLETED' | 'INVALIDATED' | 'FAILED' | 'HALTED_BY_USER_STOP' | 'HALTED_BY_EMERGENCY_STOP';
export declare const TERMINAL_STRATEGIC_MEMORY_STATES: Set<StrategicMemoryLifecycleStatus>;
export type StrategicMemoryConflictCategory = 'STRATEGIC_PRECEDENT_CONFLICT' | 'POLICY_ALIGNMENT_CONFLICT' | 'LEASE_ENVELOPE_CONFLICT' | 'FEDERATION_SCOPE_CONFLICT' | 'LINEAGE_AUTHENTICITY_CONFLICT' | 'VERSION_CAS_CONFLICT' | 'META_LEARNING_CONTRADICTION' | 'RETENTION_EXPIRATION_CONFLICT';
export type StrategicDriftCategory = 'STRATEGIC_GOAL_DRIFT' | 'POLICY_COMPLIANCE_DRIFT' | 'FEDERATION_TOPOLOGY_DRIFT' | 'LEASE_INVARIANT_DRIFT' | 'CONFIDENCE_DEFLATION_DRIFT' | 'LINEAGE_DIVERGENCE_DRIFT' | 'RECONCILIATION_VOLATILITY_DRIFT' | 'TEMPORAL_STALENESS_DRIFT' | 'PROVENANCE_TAMPER_DRIFT' | 'TENANT_BOUNDARY_DRIFT';
export type StrategicDriftSeverity = 'HEALTHY' | 'DEGRADED' | 'WARNING' | 'CRITICAL';
export declare const DRIFT_THRESHOLDS: {
    readonly HEALTHY_MAX: 0.2;
    readonly DEGRADED_MAX: 0.5;
    readonly WARNING_MAX: 0.75;
};
export type StrategicMemoryCheckpoint = 'STRATEGIC_MEM_ENTRY' | 'PRE_RECORD_REGISTRATION' | 'PRE_RECORD_ADMISSION' | 'PRE_INDEXING_COMMIT' | 'PRE_RETRIEVAL_QUERY' | 'POST_RETRIEVAL_FILTER' | 'PRE_SYNTHESIS_EVALUATION' | 'PRE_META_LEARNING_ROUND' | 'POST_META_LEARNING_VERIFY' | 'PRE_DRIFT_ANALYSIS' | 'POST_DRIFT_EVALUATION' | 'PRE_STATE_MUTATION' | 'PRE_CONTINUITY_COMMIT' | 'PRE_PERSISTENCE' | 'POST_PERSISTENCE' | 'POST_GOVERNANCE_COMMIT';
export type StrategicMemoryAuditEventType = 'STRATEGIC_MEM_SESSION_CREATED' | 'STRATEGIC_MEM_SESSION_INITIALIZED' | 'STRATEGIC_MEM_RECORD_REGISTERED' | 'STRATEGIC_MEM_RECORD_ADMITTED' | 'STRATEGIC_MEM_RECORD_REJECTED' | 'STRATEGIC_MEM_INDEX_UPDATED' | 'STRATEGIC_MEM_INDEX_PRUNED' | 'STRATEGIC_MEM_RETRIEVAL_REQUESTED' | 'STRATEGIC_MEM_RETRIEVAL_COMPLETED' | 'STRATEGIC_MEM_RETRIEVAL_EMPTY' | 'STRATEGIC_MEM_SYNTHESIS_STARTED' | 'STRATEGIC_MEM_SYNTHESIS_ROUND_COMPLETED' | 'STRATEGIC_MEM_META_LEARNING_STARTED' | 'STRATEGIC_MEM_META_LEARNING_ROUND_COMPLETED' | 'STRATEGIC_MEM_RECOMMENDATION_GENERATED' | 'STRATEGIC_MEM_RECOMMENDATION_REJECTED' | 'STRATEGIC_MEM_DRIFT_EVALUATION_STARTED' | 'STRATEGIC_MEM_DRIFT_EVALUATION_COMPLETED' | 'STRATEGIC_MEM_DRIFT_WARNING_EMITTED' | 'STRATEGIC_MEM_DRIFT_CRITICAL_HALT' | 'STRATEGIC_MEM_CONFLICT_DETECTED' | 'STRATEGIC_MEM_CONFLICT_RESOLVED' | 'STRATEGIC_MEM_REVIEW_REQUIRED_TRIGGERED' | 'STRATEGIC_MEM_HUMAN_OVERRIDE_RECORDED' | 'STRATEGIC_MEM_RECORD_SEALED' | 'STRATEGIC_MEM_RECORD_EXPIRED' | 'STRATEGIC_MEM_RECORD_INVALIDATED' | 'STRATEGIC_MEM_STATE_MUTATED' | 'STRATEGIC_MEM_CONTINUITY_SNAPSHOT_SEALED' | 'STRATEGIC_MEM_OCC_CONFLICT_DETECTED' | 'STRATEGIC_MEM_SECURITY_VIOLATION_BLOCKED' | 'STRATEGIC_MEM_USER_STOP_HALTED' | 'STRATEGIC_MEM_EMERGENCY_STOP_HALTED' | 'STRATEGIC_MEM_PERSISTENCE_COMMITTED' | 'STRATEGIC_MEM_PERSISTENCE_RECOVERED' | 'STRATEGIC_MEM_SESSION_COMPLETED';
export interface ReconciliationPrecedentEntry {
    key: string;
    reconciledValue: unknown;
    sourceFederationIds: string[];
    reconciliationRuleIndex: number;
    timestamp: number;
}
export interface ConflictResolutionPrecedentEntry {
    conflictId: string;
    category: StrategicMemoryConflictCategory;
    resolutionStrategy: 'PRECEDENT_OVERRIDE' | 'POLICY_HARMONIZED' | 'REVIEW_REQUIRED';
    resolvedOutcome: string;
    arbitratedBy: string;
    timestamp: number;
}
export interface StrategicMemoryRecord {
    recordId: string;
    tenantId: string;
    sessionId: string;
    sourceConvergenceSessionId: string;
    sourceConvergenceResultHash: string;
    missionId: string;
    objectiveId: string;
    generation: number;
    participatingFederations: string[];
    convergedStrategyDigest: string;
    reconciliationPrecedents: ReconciliationPrecedentEntry[];
    conflictResolutions: ConflictResolutionPrecedentEntry[];
    policyMetaEvaluationDigest: string;
    confidenceScore: number;
    frequencyCount: number;
    stabilityScore: number;
    creationTimestamp: number;
    lastAccessedTimestamp: number;
    retentionEpoch: number;
    isSealed: boolean;
    version: number;
    provenanceHash: string;
}
export interface StrategicIndexEntry {
    indexId: string;
    tenantId: string;
    recordId: string;
    missionId: string;
    objectiveId: string;
    participatingFederations: string[];
    keywords: string[];
    confidenceScore: number;
    creationTimestamp: number;
    entryHash: string;
}
export interface StrategicRetrievalQuery {
    queryId: string;
    tenantId: string;
    sessionId: string;
    missionId?: string;
    objectiveId?: string;
    targetFederations?: string[];
    keywords?: string[];
    minConfidence?: number;
    limit?: number;
}
export interface StrategicRetrievalResult {
    record: StrategicMemoryRecord;
    relevanceScore: number;
    retrievalTimestamp: number;
}
export interface MetaLearningRound {
    roundId: string;
    tenantId: string;
    sessionId: string;
    roundIndex: number;
    evaluatedRecordIds: string[];
    extractedPatternsCount: number;
    timestamp: number;
    roundHash: string;
}
export interface MetaLearningRecommendation {
    recommendationId: string;
    tenantId: string;
    sessionId: string;
    category: 'STRATEGY_TEMPLATE' | 'DEPENDENCY_LAYOUT' | 'CONFLICT_AVOIDANCE';
    summary: string;
    recommendedTopology: string[];
    confidenceScore: number;
    isAdvisoryOnly: true;
    humanReviewRequired: boolean;
    provenanceHash: string;
    timestamp: number;
}
export interface StrategicDriftSnapshot {
    snapshotId: string;
    tenantId: string;
    sessionId: string;
    categoryDriftScores: Record<StrategicDriftCategory, number>;
    aggregateDriftScore: number;
    severity: StrategicDriftSeverity;
    evaluatedRecordsCount: number;
    timestamp: number;
    snapshotHash: string;
}
export interface InstitutionalMemoryContinuity {
    continuityId: string;
    tenantId: string;
    sessionId: string;
    sessionEpoch: number;
    totalRecordsCount: number;
    activeDriftScore: number;
    previousContinuityHash: string;
    timestamp: number;
    continuityHash: string;
}
export interface StrategicMemoryAuditEvent {
    eventId: string;
    eventType: StrategicMemoryAuditEventType;
    timestamp: number;
    tenantId: string;
    sessionId: string;
    humanOperatorId?: string;
    missionId?: string;
    objectiveId?: string;
    federationId?: string;
    generation?: number;
    details?: Record<string, unknown>;
    previousHash: string;
    eventHash: string;
    provenanceHash: string;
}
export declare class GovernedStrategicMemoryError extends Error {
    readonly code: string;
    constructor(message: string, code: string);
}
export declare class GovernedStrategicMemoryConcurrencyError extends GovernedStrategicMemoryError {
    constructor(message: string);
}
export declare class GovernedStrategicMemorySecurityError extends GovernedStrategicMemoryError {
    constructor(message: string);
}
export declare class GovernedStrategicMemoryDriftError extends GovernedStrategicMemoryError {
    constructor(message: string);
}
export declare class GovernedStrategicMemoryLifecycleError extends GovernedStrategicMemoryError {
    constructor(message: string);
}
export declare function deterministicJsonStringify(obj: unknown): string;
export declare function computeSha256(content: string): string;
export declare function computeStrategicMemoryRecordHash(record: StrategicMemoryRecord): string;
export declare function computeStrategicIndexEntryHash(entry: StrategicIndexEntry): string;
export declare function computeRetrievalQueryHash(query: StrategicRetrievalQuery): string;
export declare function computeMetaLearningRoundHash(round: MetaLearningRound): string;
export declare function computeMetaLearningRecommendationHash(rec: MetaLearningRecommendation): string;
export declare function computeStrategicDriftSnapshotHash(snapshot: StrategicDriftSnapshot): string;
export declare function computeInstitutionalMemoryContinuityHash(continuity: InstitutionalMemoryContinuity): string;
export declare function computeStrategicMemoryAuditHash(event: StrategicMemoryAuditEvent): string;
