import type { PolicyEvolutionIntakeId } from '../policyFeedbackReview/policyFeedbackReviewTypes.js';
import type { EvolutionPlanId, CandidateDraftId } from '../policyEvolutionPlanning/policyEvolutionPlanningTypes.js';
import type { AuthorizationRequestId, AuthorizationDecisionId, ActivationReadinessId, HumanAuthorizationRole } from '../policyCandidateAuthorization/policyCandidateAuthorizationTypes.js';
export type StagedActivationId = string & {
    readonly __brand: unique symbol;
};
export type ActivationPreflightId = string & {
    readonly __brand: unique symbol;
};
export type ActivationCommitId = string & {
    readonly __brand: unique symbol;
};
export type ActivePolicyStateId = string & {
    readonly __brand: unique symbol;
};
export type StagedActivationProvenanceId = string & {
    readonly __brand: unique symbol;
};
export declare function createStagedActivationId(raw: string): StagedActivationId;
export declare function createActivationPreflightId(raw: string): ActivationPreflightId;
export declare function createActivationCommitId(raw: string): ActivationCommitId;
export declare function createActivePolicyStateId(raw: string): ActivePolicyStateId;
export declare function createStagedActivationProvenanceId(raw: string): StagedActivationProvenanceId;
export type StagedPolicyLifecycleState = 'STAGING_REQUESTED' | 'STAGED' | 'PREFLIGHT_VALIDATED' | 'ACTIVATION_AUTHORIZED' | 'ACTIVATION_COMMITTED' | 'ACTIVE_POLICY' | 'STAGING_BLOCKED' | 'PREFLIGHT_BLOCKED' | 'ACTIVATION_BLOCKED' | 'ACTIVATION_REJECTED' | 'ACTIVATION_EXPIRED' | 'ACTIVATION_CANCELLED' | 'ACTIVATION_CONFLICT' | 'ACTIVATION_UNKNOWN' | 'ACTIVATION_CORRUPTED';
export type ActivationPreflightStatus = 'READY' | 'BLOCKED' | 'INVALID' | 'EXPIRED' | 'CONFLICT' | 'UNKNOWN';
/**
 * Immutable Staged Policy Representation.
 * Pure staged artifact; NEVER an active policy.
 */
export interface StagedPolicy {
    readonly stagedActivationId: StagedActivationId;
    readonly candidateDraftId: CandidateDraftId;
    readonly evolutionPlanId: EvolutionPlanId;
    readonly intakeId: PolicyEvolutionIntakeId;
    readonly authorizationRequestId: AuthorizationRequestId;
    readonly authorizationDecisionId: AuthorizationDecisionId;
    readonly activationReadinessId: ActivationReadinessId;
    readonly tenantPartition: string;
    readonly sourcePolicyVersion: string;
    readonly proposedPolicyVersion: string;
    readonly targetPolicyDomain: string;
    readonly stagedModifications: Record<string, any>;
    readonly state: StagedPolicyLifecycleState;
    readonly preflightRequirements: readonly string[];
    readonly provenanceHeadHash: string;
    readonly stagedAt: string;
    readonly isActivePolicy: false;
    readonly isActivated: false;
    readonly isAutonomousMutation: false;
}
/**
 * Independent Preflight Verification Result.
 */
export interface ActivationPreflightResult {
    readonly preflightId: ActivationPreflightId;
    readonly stagedActivationId: StagedActivationId;
    readonly candidateDraftId: CandidateDraftId;
    readonly tenantPartition: string;
    readonly status: ActivationPreflightStatus;
    readonly checksPassed: readonly string[];
    readonly blockingReasons: readonly string[];
    readonly evaluatedAt: string;
}
/**
 * Explicit Human Governed Activation Authorization.
 * Formal human governance clearance permitting state transition to active policy.
 */
export interface GovernedActivationAuthorization {
    readonly authorizationId: string;
    readonly stagedActivationId: StagedActivationId;
    readonly candidateDraftId: CandidateDraftId;
    readonly tenantPartition: string;
    readonly authorizedBy: string;
    readonly authorizedRole: HumanAuthorizationRole;
    readonly governanceRationale: string;
    readonly preflightId: ActivationPreflightId;
    readonly authorizedAt: string;
    readonly provenanceHash: string;
}
/**
 * Active Policy State Artifact.
 * Result of the governed atomic commit transition.
 */
export interface ActivePolicyState {
    readonly activePolicyStateId: ActivePolicyStateId;
    readonly activationCommitId: ActivationCommitId;
    readonly stagedActivationId: StagedActivationId;
    readonly candidateDraftId: CandidateDraftId;
    readonly evolutionPlanId: EvolutionPlanId;
    readonly intakeId: PolicyEvolutionIntakeId;
    readonly authorizationDecisionId: AuthorizationDecisionId;
    readonly activationReadinessId: ActivationReadinessId;
    readonly preflightId: ActivationPreflightId;
    readonly tenantPartition: string;
    readonly previousPolicyVersion: string;
    readonly activePolicyVersion: string;
    readonly targetPolicyDomain: string;
    readonly activeModifications: Record<string, any>;
    readonly activatedBy: string;
    readonly activatedRole: HumanAuthorizationRole;
    readonly activatedAt: string;
    readonly provenanceHeadHash: string;
    readonly isActivePolicy: true;
    readonly isActivated: true;
}
/**
 * Cryptographic Provenance Record for Staged Activation.
 */
export interface StagedActivationProvenanceRecord {
    readonly provenanceId: StagedActivationProvenanceId;
    readonly tenantPartition: string;
    readonly candidateDraftId: CandidateDraftId;
    readonly stagedActivationId?: StagedActivationId;
    readonly authorizationDecisionId?: AuthorizationDecisionId;
    readonly activationReadinessId?: ActivationReadinessId;
    readonly activationPreflightId?: ActivationPreflightId;
    readonly activationCommitId?: ActivationCommitId;
    readonly eventType: string;
    readonly timestamp: string;
    readonly previousHash: string;
    readonly recordHash: string;
    readonly payloadHash: string;
}
/**
 * Options for staged policy activation components.
 */
export interface PolicyStagedActivationOptions {
    readonly baseDir?: string;
    readonly isUserStopActive?: () => boolean;
}
