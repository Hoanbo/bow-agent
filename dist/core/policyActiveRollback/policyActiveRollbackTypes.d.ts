import type { HumanAuthorizationRole } from '../policyCandidateAuthorization/policyCandidateAuthorizationTypes.js';
export type ActiveRollbackRequestId = string & {
    readonly __brand: unique symbol;
};
export type RollbackTargetId = string & {
    readonly __brand: unique symbol;
};
export type RollbackEvaluationId = string & {
    readonly __brand: unique symbol;
};
export type SunsetRequestId = string & {
    readonly __brand: unique symbol;
};
export type SunsetEvaluationId = string & {
    readonly __brand: unique symbol;
};
export type RecoveryRequestId = string & {
    readonly __brand: unique symbol;
};
export type RecoveryEvaluationId = string & {
    readonly __brand: unique symbol;
};
export type RollbackCommitId = string & {
    readonly __brand: unique symbol;
};
export type SunsetCommitId = string & {
    readonly __brand: unique symbol;
};
export type RecoveryCommitId = string & {
    readonly __brand: unique symbol;
};
export type RollbackProvenanceId = string & {
    readonly __brand: unique symbol;
};
export declare function createActiveRollbackRequestId(raw: string): ActiveRollbackRequestId;
export declare function createRollbackTargetId(raw: string): RollbackTargetId;
export declare function createRollbackEvaluationId(raw: string): RollbackEvaluationId;
export declare function createSunsetRequestId(raw: string): SunsetRequestId;
export declare function createSunsetEvaluationId(raw: string): SunsetEvaluationId;
export declare function createRecoveryRequestId(raw: string): RecoveryRequestId;
export declare function createRecoveryEvaluationId(raw: string): RecoveryEvaluationId;
export declare function createRollbackCommitId(raw: string): RollbackCommitId;
export declare function createSunsetCommitId(raw: string): SunsetCommitId;
export declare function createRecoveryCommitId(raw: string): RecoveryCommitId;
export declare function createRollbackProvenanceId(raw: string): RollbackProvenanceId;
export type RollbackRequestState = 'REQUESTED' | 'REVALIDATING' | 'HUMAN_REVIEW_REQUIRED' | 'AUTHORIZED' | 'REJECTED' | 'DEFERRED' | 'BLOCKED' | 'COMMITTED' | 'VERIFIED';
export type SunsetLifecycleState = 'NOT_REQUESTED' | 'REQUESTED' | 'EVALUATED' | 'HUMAN_REVIEW_REQUIRED' | 'AUTHORIZED' | 'COMMITTED' | 'VERIFIED' | 'BLOCKED';
export type RecoveryLifecycleState = 'NOT_REQUESTED' | 'REQUESTED' | 'REVALIDATING' | 'HUMAN_REVIEW_REQUIRED' | 'AUTHORIZED' | 'STAGED' | 'COMMITTED' | 'VERIFIED' | 'BLOCKED';
export type RollbackRevalidationStatus = 'VALID' | 'BLOCKED' | 'INVALID' | 'CONTRADICTORY' | 'SUPERSEDED' | 'UNKNOWN';
export type SunsetEvaluationStatus = 'VALID' | 'BLOCKED' | 'INVALID' | 'UNKNOWN';
export type RecoveryEvaluationStatus = 'VALID' | 'BLOCKED' | 'INVALID' | 'UNKNOWN';
export declare const ROLLBACK_HARD_FORBIDDEN_ACTIONS: readonly ["transfer_funds", "delete_database", "bypass_robot_interlocks", "execute_untrusted_host_script"];
export type RollbackHardForbiddenAction = typeof ROLLBACK_HARD_FORBIDDEN_ACTIONS[number];
/**
 * Historically verified active policy record preserved in immutable storage.
 */
export interface HistoricalPolicyVersion {
    readonly targetId: RollbackTargetId;
    readonly tenantPartition: string;
    readonly policyVersion: string;
    readonly activePolicyStateId: string;
    readonly activationCommitId: string;
    readonly targetPolicyDomain: string;
    readonly policyModifications: Record<string, any>;
    readonly activatedBy: string;
    readonly activatedRole: string;
    readonly activatedAt: string;
    readonly provenanceHeadHash: string;
    readonly verified: boolean;
    readonly isHardForbiddenProtected: boolean;
    readonly isActivePolicy: false;
}
/**
 * Governed Rollback Request.
 */
export interface RollbackRequest {
    readonly rollbackRequestId: ActiveRollbackRequestId;
    readonly tenantPartition: string;
    readonly currentActivePolicyStateId: string;
    readonly currentActivePolicyVersion: string;
    readonly targetPolicyVersion: string;
    readonly targetId: RollbackTargetId;
    readonly requestedBy: string;
    readonly requestedRole?: string;
    readonly reason: string;
    readonly state: RollbackRequestState;
    readonly requestedAt: string;
    readonly isAutonomous: false;
    readonly isActivePolicy: false;
    readonly isPolicyMutation: false;
}
/**
 * Independent Rollback Revalidation Result.
 */
export interface RollbackRevalidationResult {
    readonly revalidationId: RollbackEvaluationId;
    readonly rollbackRequestId: ActiveRollbackRequestId;
    readonly tenantPartition: string;
    readonly currentActiveVersion: string;
    readonly targetPolicyVersion: string;
    readonly targetId: RollbackTargetId;
    readonly valid: boolean;
    readonly status: RollbackRevalidationStatus;
    readonly checksPassed: readonly string[];
    readonly blockingReasons: readonly string[];
    readonly revalidatedAt: string;
}
/**
 * Governed Sunset Request.
 */
export interface SunsetRequest {
    readonly sunsetRequestId: SunsetRequestId;
    readonly tenantPartition: string;
    readonly currentActivePolicyStateId: string;
    readonly currentActivePolicyVersion: string;
    readonly requestedBy: string;
    readonly requestedRole?: string;
    readonly reason: string;
    readonly replacementPolicyVersion?: string;
    readonly state: SunsetLifecycleState;
    readonly requestedAt: string;
    readonly isAutonomous: false;
    readonly isActivePolicy: false;
}
/**
 * Independent Sunset Evaluation Result.
 */
export interface SunsetEvaluationResult {
    readonly evaluationId: SunsetEvaluationId;
    readonly sunsetRequestId: SunsetRequestId;
    readonly tenantPartition: string;
    readonly valid: boolean;
    readonly status: SunsetEvaluationStatus;
    readonly humanReviewRequired: boolean;
    readonly checksPassed: readonly string[];
    readonly blockingReasons: readonly string[];
    readonly evaluatedAt: string;
}
export type ActiveRollbackRequest = RollbackRequest;
export type ActiveSunsetRequest = SunsetRequest;
export type ActiveRecoveryRequest = RecoveryRequest;
export interface RecoveryRequest {
    readonly recoveryRequestId: RecoveryRequestId;
    readonly tenantPartition: string;
    readonly sourceState: 'ROLLED_BACK' | 'SUNSET' | 'DEACTIVATED';
    readonly recoveryTargetVersion: string;
    readonly targetId: RollbackTargetId;
    readonly requestedBy: string;
    readonly requestedRole?: string;
    readonly reason: string;
    readonly state: RecoveryLifecycleState;
    readonly requestedAt: string;
    readonly isAutonomous: false;
    readonly isActivePolicy: false;
}
/**
 * Independent Recovery Evaluation Result.
 */
export interface RecoveryEvaluationResult {
    readonly evaluationId: RecoveryEvaluationId;
    readonly recoveryRequestId: RecoveryRequestId;
    readonly tenantPartition: string;
    readonly recoveryTargetVersion: string;
    readonly targetId: RollbackTargetId;
    readonly valid: boolean;
    readonly status: RecoveryEvaluationStatus;
    readonly checksPassed: readonly string[];
    readonly blockingReasons: readonly string[];
    readonly evaluatedAt: string;
}
/**
 * Governed Rollback / Sunset / Recovery Authorization.
 * Must originate from an authorized human operator with anti-self-approval.
 */
export interface GovernedRollbackAuthorization {
    readonly authorizationId: string;
    readonly operationType: 'ROLLBACK' | 'SUNSET' | 'RECOVERY';
    readonly targetRequestId: string;
    readonly tenantPartition: string;
    readonly authorizedBy: string;
    readonly authorizedRole: HumanAuthorizationRole;
    readonly governanceRationale: string;
    readonly evaluationId: string;
    readonly authorizedAt: string;
    readonly provenanceHash: string;
}
/**
 * Atomic Rollback Commit Result.
 */
export interface RollbackCommitResult {
    readonly commitId: RollbackCommitId;
    readonly rollbackRequestId: ActiveRollbackRequestId;
    readonly tenantPartition: string;
    readonly previousActivePolicyVersion: string;
    readonly newActivePolicyStateId: string;
    readonly newActivePolicyVersion: string;
    readonly committedBy: string;
    readonly committedRole: HumanAuthorizationRole;
    readonly committedAt: string;
    readonly resynchronized: boolean;
    readonly provenanceHeadHash: string;
}
/**
 * Atomic Sunset Commit Result.
 */
export interface SunsetCommitResult {
    readonly commitId: SunsetCommitId;
    readonly sunsetRequestId: SunsetRequestId;
    readonly tenantPartition: string;
    readonly retiredPolicyVersion: string;
    readonly replacementPolicyVersion?: string;
    readonly committedBy: string;
    readonly committedRole: HumanAuthorizationRole;
    readonly committedAt: string;
    readonly resynchronized: boolean;
    readonly provenanceHeadHash: string;
}
/**
 * Atomic Recovery Commit Result.
 */
export interface RecoveryCommitResult {
    readonly commitId: RecoveryCommitId;
    readonly recoveryRequestId: RecoveryRequestId;
    readonly tenantPartition: string;
    readonly recoveredActivePolicyStateId: string;
    readonly recoveredPolicyVersion: string;
    readonly committedBy: string;
    readonly committedRole: HumanAuthorizationRole;
    readonly committedAt: string;
    readonly resynchronized: boolean;
    readonly provenanceHeadHash: string;
}
/**
 * Cryptographic Provenance Record for Rollback, Sunset, and Recovery.
 */
export interface RollbackProvenanceRecord {
    readonly provenanceId: RollbackProvenanceId;
    readonly tenantPartition: string;
    readonly activePolicyStateId?: string;
    readonly targetPolicyVersion?: string;
    readonly rollbackRequestId?: ActiveRollbackRequestId;
    readonly sunsetRequestId?: SunsetRequestId;
    readonly recoveryRequestId?: RecoveryRequestId;
    readonly authorizationDecisionId?: string;
    readonly commitId?: string;
    readonly eventType: string;
    readonly timestamp: string;
    readonly previousHash: string;
    readonly recordHash: string;
    readonly payloadHash: string;
}
/**
 * Configuration options for policyActiveRollback domain.
 */
export interface PolicyActiveRollbackOptions {
    readonly baseDir?: string;
    readonly isUserStopActive?: () => boolean;
}
