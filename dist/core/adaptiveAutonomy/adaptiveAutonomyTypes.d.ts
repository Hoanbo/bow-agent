export declare const ADAPTIVE_AUTONOMY_SCHEMA_VERSION = "1.5.12";
/** Default & hard autonomy ceilings / Các giới hạn trần tự chủ mặc định & cứng */
export declare const MAX_OPERATIONAL_CYCLES = 100;
export declare const MAX_RECOVERY_ATTEMPTS = 3;
export declare const MAX_ADAPTATION_ATTEMPTS = 5;
export declare const MAX_CONTINUITY_GENERATIONS = 10;
export declare const MAX_SESSION_DURATION_MS = 86400000;
export declare const MAX_CONSECUTIVE_FAILURES = 3;
export declare const MAX_CONSECUTIVE_DEGRADATIONS = 3;
export type AdaptiveAutonomyState = 'INITIALIZING' | 'AUTHORIZED' | 'ACTIVE' | 'DEGRADED' | 'RECOVERY_REQUIRED' | 'RECOVERING' | 'ADAPTATION_REQUIRED' | 'AWAITING_HUMAN_REVIEW' | 'SUSPENDED' | 'RESUMABLE' | 'COMPLETED' | 'FAILED' | 'HALTED_BY_USER_STOP' | 'HALTED_BY_EMERGENCY_STOP' | 'INVALIDATED';
export type OperationalHealthState = 'HEALTHY' | 'DEGRADED' | 'UNSTABLE' | 'CRITICAL' | 'UNKNOWN';
export type RecoverableFailureClass = 'TRANSIENT_EXECUTION_FAILURE' | 'STALE_ENVIRONMENT' | 'TEMPORARY_POLICY_UNAVAILABLE' | 'RECOVERABLE_PERSISTENCE_FAILURE' | 'LEASE_REVALIDATION_REQUIRED' | 'ENVIRONMENT_DRIFT';
export type NonRecoverableFailureClass = 'AUTHORIZATION_REVOKED' | 'SCOPE_EXPANSION_ATTEMPT' | 'USER_STOP_ACTIVATED' | 'EMERGENCY_STOP_ACTIVATED' | 'BUDGET_EXHAUSTION' | 'CONSECUTIVE_RECOVERY_EXHAUSTED' | 'INTEGRITY_MISMATCH' | 'TENANT_VIOLATION' | 'UNRECOVERABLE_ERROR';
export type RiskTier = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export interface AutonomyBudgetSnapshot {
    readonly maxOperationalCycles: number;
    readonly cyclesConsumed: number;
    readonly maxRecoveryAttempts: number;
    readonly recoveryAttemptsConsumed: number;
    readonly maxAdaptationAttempts: number;
    readonly adaptationAttemptsConsumed: number;
    readonly maxContinuityGenerations: number;
    readonly continuityGenerationsConsumed: number;
    readonly sessionDurationLimitMs: number;
    readonly sessionStartedAt: number;
    readonly consecutiveFailures: number;
    readonly consecutiveDegradations: number;
}
export interface RecoveryPolicy {
    readonly allowedFailureClasses: readonly RecoverableFailureClass[];
    readonly maxAttemptsPerIncident: number;
    readonly backoffBaseMs: number;
    readonly maxBackoffMs: number;
    readonly requireHumanReviewOnExhaustion: boolean;
}
export interface AdaptationBoundary {
    readonly immutableAuthorizationScope: readonly string[];
    readonly allowedParameterAdjustments: readonly string[];
    readonly allowRetrySequenceReordering: boolean;
    readonly allowTimeoutExpansionMaxMs: number;
    readonly allowAlternativeToolSelection: boolean;
}
export interface AdaptiveAutonomyAuthorizationEnvelope {
    readonly envelopeId: string;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly humanOperatorId: string;
    readonly authorizationScope: readonly string[];
    readonly riskTier: RiskTier;
    readonly humanConfirmationToken?: string;
    readonly humanConfirmationExpiresAt?: number;
    readonly leaseId: string;
    readonly issuedAt: number;
    readonly expiresAt: number;
    readonly provenanceHash: string;
}
export interface OperationalIncident {
    readonly incidentId: string;
    readonly timestamp: number;
    readonly failureClass: RecoverableFailureClass | NonRecoverableFailureClass;
    readonly isRecoverable: boolean;
    readonly errorDetails: string;
    readonly failureContext: Record<string, unknown>;
    readonly cycleNumber: number;
}
export interface HealthEvaluation {
    readonly evaluationId: string;
    readonly timestamp: number;
    readonly cycleNumber: number;
    readonly healthState: OperationalHealthState;
    readonly isProgressing: boolean;
    readonly successFailureRatio: number;
    readonly activeIncidents: readonly OperationalIncident[];
    readonly telemetrySummary: Record<string, unknown>;
    readonly evaluationHash: string;
}
export interface RecoveryCheckpoint {
    readonly checkpointId: string;
    readonly timestamp: number;
    readonly cycleNumber: number;
    readonly generationNumber: number;
    readonly stateSnapshot: Record<string, unknown>;
    readonly snapshotHash: string;
}
export interface RecoveryAttempt {
    readonly attemptId: string;
    readonly incidentId: string;
    readonly timestamp: number;
    readonly attemptNumber: number;
    readonly recoveryAction: string;
    readonly isSuccessful: boolean;
    readonly details: string;
    readonly checkpointId: string;
    readonly attemptHash: string;
}
export interface AdaptationDecision {
    readonly decisionId: string;
    readonly timestamp: number;
    readonly cycleNumber: number;
    readonly rationale: string;
    readonly modifiedParameters: Record<string, unknown>;
    readonly pdpApproved: boolean;
    readonly pepVerified: boolean;
    readonly scopeCompliant: boolean;
    readonly leaseCompliant: boolean;
    readonly decisionHash: string;
}
export interface RecoveryGeneration {
    readonly generationIndex: number;
    readonly startedAt: number;
    readonly endedAt?: number;
    readonly completedCycles: number;
    readonly recoveryAttempts: readonly RecoveryAttempt[];
    readonly adaptations: readonly AdaptationDecision[];
    readonly generationHash: string;
}
export interface ContinuitySnapshot {
    readonly snapshotId: string;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly objectiveId: string;
    readonly generationIndex: number;
    readonly cycleNumber: number;
    readonly completedWork: readonly string[];
    readonly pendingWork: readonly string[];
    readonly lastHealthState: OperationalHealthState;
    readonly recoveryState: {
        readonly attemptsConsumed: number;
        readonly lastRecoverySuccess: boolean;
    };
    readonly adaptationState: {
        readonly adaptationsConsumed: number;
    };
    readonly budgetState: AutonomyBudgetSnapshot;
    readonly leaseId: string;
    readonly environmentFingerprint: string;
    readonly previousSnapshotHash: string;
    readonly currentSnapshotHash: string;
    readonly timestamp: number;
}
export interface OperationalContinuityRecord {
    readonly recordId: string;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly snapshots: readonly ContinuitySnapshot[];
    readonly continuityStatus: 'VALID' | 'DEGRADED' | 'DRIFTED' | 'INVALIDATED';
    readonly lastVerifiedAt: number;
}
export interface SupervisionState {
    readonly state: AdaptiveAutonomyState;
    readonly currentHealth: OperationalHealthState;
    readonly activeGeneration: number;
    readonly currentCycle: number;
    readonly lastError?: string;
    readonly waitingForHumanReview: boolean;
    readonly humanReviewReason?: string;
}
export interface AdaptiveAutonomySession {
    readonly sessionId: string;
    readonly tenantId: string;
    readonly objectiveId: string;
    readonly objectiveTitle: string;
    readonly authorizationEnvelope: AdaptiveAutonomyAuthorizationEnvelope;
    readonly recoveryPolicy: RecoveryPolicy;
    readonly adaptationBoundary: AdaptationBoundary;
    readonly supervisionState: SupervisionState;
    readonly budget: AutonomyBudgetSnapshot;
    readonly incidents: readonly OperationalIncident[];
    readonly healthEvaluations: readonly HealthEvaluation[];
    readonly recoveryAttempts: readonly RecoveryAttempt[];
    readonly adaptations: readonly AdaptationDecision[];
    readonly generations: readonly RecoveryGeneration[];
    readonly continuityRecord: OperationalContinuityRecord;
    readonly createdAt: number;
    readonly updatedAt: number;
    readonly version: number;
    readonly sessionHash: string;
}
export interface AdaptiveAutonomyResult {
    readonly sessionId: string;
    readonly tenantId: string;
    readonly finalState: AdaptiveAutonomyState;
    readonly completedSuccessfully: boolean;
    readonly totalCycles: number;
    readonly totalGenerations: number;
    readonly totalRecoveries: number;
    readonly totalAdaptations: number;
    readonly wallClockDurationMs: number;
    readonly lastHealthState: OperationalHealthState;
    readonly resultDetails: string;
    readonly auditChainHeadHash: string;
    readonly finalSnapshotHash: string;
}
export declare class AdaptiveAutonomyError extends Error {
    readonly code: string;
    readonly tenantId?: string;
    readonly sessionId?: string;
    readonly timestamp: number;
    constructor(message: string, code?: string, tenantId?: string, sessionId?: string);
}
export declare class AdaptiveAutonomyValidationError extends AdaptiveAutonomyError {
    constructor(message: string, tenantId?: string, sessionId?: string);
}
export declare class AdaptiveAutonomyAuthorizationError extends AdaptiveAutonomyError {
    constructor(message: string, tenantId?: string, sessionId?: string);
}
export declare class AdaptiveAutonomyTenantIsolationError extends AdaptiveAutonomyError {
    constructor(message: string, tenantId?: string, sessionId?: string);
}
export declare class AdaptiveAutonomySessionIsolationError extends AdaptiveAutonomyError {
    constructor(message: string, tenantId?: string, sessionId?: string);
}
export declare class AdaptiveAutonomyLeaseError extends AdaptiveAutonomyError {
    constructor(message: string, tenantId?: string, sessionId?: string);
}
export declare class AdaptiveAutonomyBudgetError extends AdaptiveAutonomyError {
    constructor(message: string, tenantId?: string, sessionId?: string);
}
export declare class AdaptiveAutonomyRecoveryError extends AdaptiveAutonomyError {
    constructor(message: string, tenantId?: string, sessionId?: string);
}
export declare class AdaptiveAutonomyAdaptationError extends AdaptiveAutonomyError {
    constructor(message: string, tenantId?: string, sessionId?: string);
}
export declare class AdaptiveAutonomyConcurrencyError extends AdaptiveAutonomyError {
    constructor(message: string, tenantId?: string, sessionId?: string);
}
export declare class AdaptiveAutonomyUserStopError extends AdaptiveAutonomyError {
    constructor(message: string, tenantId?: string, sessionId?: string);
}
export declare class AdaptiveAutonomyEmergencyStopError extends AdaptiveAutonomyError {
    constructor(message: string, tenantId?: string, sessionId?: string);
}
export declare class AdaptiveAutonomyPersistenceError extends AdaptiveAutonomyError {
    constructor(message: string, tenantId?: string, sessionId?: string);
}
export declare class AdaptiveAutonomyProvenanceError extends AdaptiveAutonomyError {
    constructor(message: string, tenantId?: string, sessionId?: string);
}
export declare class AdaptiveAutonomyGovernanceError extends AdaptiveAutonomyError {
    constructor(message: string, tenantId?: string, sessionId?: string);
}
export declare function deterministicJsonStringify(obj: unknown): string;
export declare function computeSha256(data: string): string;
export declare function computeAuthorizationEnvelopeProvenanceHash(envelope: Omit<AdaptiveAutonomyAuthorizationEnvelope, 'provenanceHash'>): string;
export declare function computeHealthEvaluationHash(evalData: Omit<HealthEvaluation, 'evaluationHash'>): string;
export declare function computeRecoveryAttemptHash(attempt: Omit<RecoveryAttempt, 'attemptHash'>): string;
export declare function computeAdaptationDecisionHash(decision: Omit<AdaptationDecision, 'decisionHash'>): string;
export declare function computeContinuitySnapshotHash(snapshot: Omit<ContinuitySnapshot, 'currentSnapshotHash'>): string;
export declare function computeAdaptiveSessionProvenanceHash(session: Omit<AdaptiveAutonomySession, 'sessionHash'>): string;
