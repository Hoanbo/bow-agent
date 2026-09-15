export declare const MAX_ACTIVE_FEDERATIONS_PER_CONVERGENCE = 5;
export declare const MAX_STRATEGY_PROPOSALS_PER_CONVERGENCE = 50;
export declare const MAX_CONVERGENCE_ROUNDS = 10;
export declare const MAX_PARTICIPATING_AGENTS_TOTAL = 40;
export declare const MAX_INTER_FEDERATION_DEPENDENCY_DEPTH = 10;
export declare const MAX_CROSS_FEDERATION_STATE_SIZE = 10000;
export declare const MAX_ACTIVE_CONVERGENCE_SESSIONS = 3;
export declare const MAX_CONVERGENCE_REASSESSMENTS = 5;
export declare const MAX_CONSECUTIVE_CONVERGENCE_FAILURES = 3;
export declare const MAX_CONVERGENCE_DURATION_MS = 86400000;
export declare const MAX_AUDIT_LOG_RECORDS_PER_SESSION = 2000;
export type CrossFederationLifecycleStatus = 'CREATED' | 'VALIDATING' | 'AUTHORIZED' | 'STRATEGY_ALIGNING' | 'RECONCILING' | 'CONVERGING' | 'STABLE' | 'REVIEW_REQUIRED' | 'SUSPENDED' | 'COMPLETED' | 'FAILED' | 'INVALIDATED' | 'HALTED_BY_USER_STOP' | 'HALTED_BY_EMERGENCY_STOP';
export type CrossFederationConflictCategory = 'CROSS_FEDERATION_KNOWLEDGE_CONFLICT' | 'STRATEGY_CONFLICT' | 'CONVERGENCE_CONFLICT' | 'LINEAGE_CONFLICT' | 'VERSION_CONFLICT' | 'AUTHORIZATION_CONFLICT' | 'LEASE_CONFLICT' | 'POLICY_CONFLICT';
export type CrossFederationDriftCategory = 'CONVERGENCE_STATE_DRIFT' | 'STRATEGY_ALIGNMENT_DRIFT' | 'FEDERATION_MEMBERSHIP_DRIFT' | 'DEPENDENCY_GRAPH_DRIFT' | 'RECONCILIATION_DRIFT' | 'POLICY_META_DRIFT' | 'LEASE_INVARIANT_DRIFT' | 'GENERATION_DRIFT' | 'PROVENANCE_HASH_DRIFT' | 'CONTINUITY_SNAPSHOT_DRIFT';
export type CrossFederationCheckpoint = 'CROSS_FED_ENTRY' | 'PRE_CROSS_FED_REGISTRATION' | 'PRE_CROSS_FED_AUTHORIZATION' | 'PRE_STRATEGY_BINDING' | 'PRE_CONVERGENCE' | 'PRE_RECONCILIATION' | 'PRE_CONFLICT_RESOLUTION' | 'PRE_POLICY_META_GOVERNANCE' | 'PRE_CROSS_FED_QUERY' | 'PRE_STATE_UPDATE' | 'PRE_CONVERGENCE_REASSESSMENT' | 'PRE_CONTINUITY_COMMIT' | 'PRE_PERSISTENCE' | 'POST_PERSISTENCE' | 'POST_STATE_VALIDATION' | 'POST_META_GOVERNANCE_COMMIT';
export type CrossFederationAuditEventType = 'CROSS_FED_SESSION_CREATED' | 'CROSS_FED_FEDERATION_REGISTERED' | 'CROSS_FED_FEDERATION_DEREGISTERED' | 'CROSS_FED_PROPOSAL_SUBMITTED' | 'CROSS_FED_PROPOSAL_VALIDATED' | 'CROSS_FED_PROPOSAL_REJECTED' | 'CROSS_FED_ALIGNMENT_STARTED' | 'CROSS_FED_ALIGNMENT_COMPLETED' | 'CROSS_FED_DEPENDENCY_BOUND' | 'CROSS_FED_DEPENDENCY_CYCLE_REJECTED' | 'CROSS_FED_RECONCILIATION_STARTED' | 'CROSS_FED_RECONCILIATION_COMPLETED' | 'CROSS_FED_CONFLICT_DETECTED' | 'CROSS_FED_CONFLICT_RESOLVED' | 'CROSS_FED_REVIEW_REQUIRED' | 'CROSS_FED_POLICY_META_EVALUATED' | 'CROSS_FED_POLICY_VIOLATION_BLOCKED' | 'CROSS_FED_LEASE_VERIFIED' | 'CROSS_FED_LEASE_EXPIRED_SUSPENDED' | 'CROSS_FED_ROUND_STARTED' | 'CROSS_FED_ROUND_COMPLETED' | 'CROSS_FED_CONVERGENCE_STABILIZED' | 'CROSS_FED_CONVERGENCE_COMPLETED' | 'CROSS_FED_REASSESSED' | 'CROSS_FED_SUSPENDED' | 'CROSS_FED_RESUMED' | 'CROSS_FED_USER_STOP' | 'CROSS_FED_EMERGENCY_STOP' | 'CROSS_FED_INVALIDATED' | 'CROSS_FED_STATE_PERSISTED' | 'CROSS_FED_STATE_RECOVERED' | 'CROSS_FED_DRIFT_DETECTED' | 'CROSS_FED_PROVENANCE_VERIFIED' | 'CROSS_FED_SECURITY_QUARANTINE';
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
export declare class GovernedCrossFederationError extends Error {
    readonly tenantId?: string;
    readonly sessionId?: string;
    constructor(message: string, tenantId?: string, sessionId?: string);
}
export declare class GovernedCrossFederationValidationError extends GovernedCrossFederationError {
    constructor(message: string, tenantId?: string, sessionId?: string);
}
export declare class GovernedCrossFederationTenantIsolationError extends GovernedCrossFederationError {
    constructor(message: string, tenantId?: string, sessionId?: string);
}
export declare class GovernedCrossFederationSessionIsolationError extends GovernedCrossFederationError {
    constructor(message: string, tenantId?: string, sessionId?: string);
}
export declare class GovernedCrossFederationAuthorizationError extends GovernedCrossFederationError {
    constructor(message: string, tenantId?: string, sessionId?: string);
}
export declare class GovernedCrossFederationLeaseError extends GovernedCrossFederationError {
    constructor(message: string, tenantId?: string, sessionId?: string);
}
export declare class GovernedCrossFederationBudgetError extends GovernedCrossFederationError {
    constructor(message: string, tenantId?: string, sessionId?: string);
}
export declare class GovernedCrossFederationLifecycleError extends GovernedCrossFederationError {
    constructor(message: string, tenantId?: string, sessionId?: string);
}
export declare class GovernedCrossFederationConflictError extends GovernedCrossFederationError {
    readonly category?: CrossFederationConflictCategory;
    constructor(message: string, category?: CrossFederationConflictCategory, tenantId?: string, sessionId?: string);
}
export declare class GovernedCrossFederationPolicyError extends GovernedCrossFederationError {
    constructor(message: string, tenantId?: string, sessionId?: string);
}
export declare class GovernedCrossFederationConcurrencyError extends GovernedCrossFederationError {
    constructor(message: string, tenantId?: string, sessionId?: string);
}
export declare class GovernedCrossFederationUserStopError extends GovernedCrossFederationError {
    constructor(message: string, tenantId?: string, sessionId?: string);
}
export declare class GovernedCrossFederationEmergencyStopError extends GovernedCrossFederationError {
    constructor(message: string, tenantId?: string, sessionId?: string);
}
export declare class GovernedCrossFederationPersistenceError extends GovernedCrossFederationError {
    constructor(message: string, tenantId?: string, sessionId?: string);
}
export declare class GovernedCrossFederationContinuityError extends GovernedCrossFederationError {
    readonly driftCategory?: CrossFederationDriftCategory;
    constructor(message: string, driftCategory?: CrossFederationDriftCategory, tenantId?: string, sessionId?: string);
}
export declare function deterministicJsonStringify(obj: unknown): string;
export declare function computeSha256(input: string): string;
export declare function computeCrossFederationStrategyHash(strategy: Omit<CrossFederationStrategyProposal, 'provenanceHash'> | CrossFederationStrategyProposal): string;
export declare function computeConvergenceProposalHash(proposal: Omit<CrossFederationStrategyProposal, 'provenanceHash'> | CrossFederationStrategyProposal): string;
export declare function computeConvergenceRoundHash(roundData: unknown): string;
export declare function computeCrossReconciliationHash(rec: Omit<CrossFederationReconciliationResult, 'provenanceHash'> | CrossFederationReconciliationResult): string;
export declare function computePolicyMetaEvaluationHash(evaluation: Omit<PolicyMetaEvaluation, 'provenanceHash'> | PolicyMetaEvaluation): string;
export declare function computeConvergenceStateSnapshotHash(state: Omit<CrossFederationConvergenceState, 'provenanceHash'> | CrossFederationConvergenceState): string;
export declare function computeConvergenceResultHash(result: unknown): string;
export declare function computeConvergenceAuditHash(audit: Omit<CrossFederationAuditRecord, 'eventHash'> | CrossFederationAuditRecord): string;
