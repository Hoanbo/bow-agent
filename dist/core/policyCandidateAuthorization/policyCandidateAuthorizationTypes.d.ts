import type { PolicyEvolutionIntakeId } from '../policyFeedbackReview/policyFeedbackReviewTypes.js';
import type { EvolutionPlanId, CandidateDraftId, CandidateDraft, CandidateValidationResult } from '../policyEvolutionPlanning/policyEvolutionPlanningTypes.js';
export type CandidateAuthorizationId = string & {
    readonly __brand: unique symbol;
};
export type AuthorizationDecisionId = string & {
    readonly __brand: unique symbol;
};
export type ActivationReadinessId = string & {
    readonly __brand: unique symbol;
};
export type AuthorizationProvenanceId = string & {
    readonly __brand: unique symbol;
};
export type AuthorizationRequestId = string & {
    readonly __brand: unique symbol;
};
export declare function createCandidateAuthorizationId(raw: string): CandidateAuthorizationId;
export declare function createAuthorizationDecisionId(raw: string): AuthorizationDecisionId;
export declare function createActivationReadinessId(raw: string): ActivationReadinessId;
export declare function createAuthorizationProvenanceId(raw: string): AuthorizationProvenanceId;
export declare function createAuthorizationRequestId(raw: string): AuthorizationRequestId;
export type CandidateAuthorizationDecisionType = 'AUTHORIZE' | 'REJECT' | 'DEFER' | 'REQUEST_MORE_EVIDENCE' | 'CANCEL';
export type ActivationReadinessState = 'READY_FOR_ACTIVATION' | 'NOT_READY' | 'BLOCKED' | 'EXPIRED' | 'REJECTED' | 'PENDING_HUMAN_AUTHORIZATION' | 'UNKNOWN';
export type HumanAuthorizationRole = 'MASTER_HUMAN_OPERATOR' | 'HUMAN_SECURITY_ADMIN' | 'OWNER';
export type CandidateAuthorizationAction = 'AUTHORIZE_FOR_ACTIVATION' | 'AUTHORIZE_FOR_SIMULATION' | 'AUTHORIZE_FOR_STAGING';
export type CandidateAuthorizationRevalidationStatus = 'VALID' | 'INVALID' | 'BLOCKED' | 'EXPIRED' | 'SUPERSEDED' | 'CONTRADICTORY';
/**
 * Governed Authorization Request for a synthesized Candidate Policy Draft.
 * Submitted to the explicit Human Authorization Boundary.
 */
export interface CandidateAuthorizationRequest {
    readonly requestId: AuthorizationRequestId;
    readonly candidateDraftId: CandidateDraftId;
    readonly evolutionPlanId: EvolutionPlanId;
    readonly intakeId: PolicyEvolutionIntakeId;
    readonly tenantPartition: string;
    readonly sourcePolicyVersion: string;
    readonly targetPolicyDomain: string;
    readonly requestedAction: CandidateAuthorizationAction;
    readonly requestedBy: string;
    readonly rationale: string;
    readonly requiredRole: HumanAuthorizationRole;
    readonly candidateDraft: CandidateDraft;
    readonly candidateValidation: CandidateValidationResult;
    readonly provenanceHeadHash: string;
    readonly createdAt: string;
    readonly expiresAt: string;
    readonly supersededBy?: string;
}
/**
 * Immutable Human Authorization Decision.
 * Pure authorization record; does NOT mutate or activate any policy.
 */
export interface HumanAuthorizationDecision {
    readonly decisionId: AuthorizationDecisionId;
    readonly requestId: AuthorizationRequestId;
    readonly candidateDraftId: CandidateDraftId;
    readonly evolutionPlanId: EvolutionPlanId;
    readonly intakeId: PolicyEvolutionIntakeId;
    readonly tenantPartition: string;
    readonly reviewerId: string;
    readonly reviewerRole: HumanAuthorizationRole;
    readonly decision: CandidateAuthorizationDecisionType;
    readonly reason: string;
    readonly decidedAt: string;
    readonly isActivePolicy: false;
    readonly isPolicyMutation: false;
    readonly isAutonomousMutation: false;
    readonly provenanceHash: string;
}
/**
 * Immutable Activation Readiness Evaluation Decision.
 * Evaluates whether an authorized candidate satisfies all prerequisites for a future activation stage.
 * Does NOT activate the candidate or mutate policy.
 */
export interface ActivationReadinessDecision {
    readonly readinessId: ActivationReadinessId;
    readonly candidateDraftId: CandidateDraftId;
    readonly authorizationDecisionId?: AuthorizationDecisionId;
    readonly evolutionPlanId: EvolutionPlanId;
    readonly intakeId: PolicyEvolutionIntakeId;
    readonly tenantPartition: string;
    readonly state: ActivationReadinessState;
    readonly prerequisitesSatisfied: readonly string[];
    readonly blockingReasons: readonly string[];
    readonly evaluatedAt: string;
    readonly isActivePolicy: false;
    readonly isActivated: false;
}
/**
 * Independent Revalidation Result for Candidate Authorization.
 */
export interface CandidateAuthorizationRevalidationResult {
    readonly valid: boolean;
    readonly candidateDraftId: CandidateDraftId;
    readonly status: CandidateAuthorizationRevalidationStatus;
    readonly tenantPartition: string;
    readonly issues: readonly string[];
    readonly revalidatedAt: string;
}
/**
 * Composite Authorization Result holding request, decision, readiness, and provenance.
 */
export interface CandidateAuthorizationResult {
    readonly request: CandidateAuthorizationRequest;
    readonly decision: HumanAuthorizationDecision;
    readonly readiness: ActivationReadinessDecision;
    readonly provenanceHash: string;
}
/**
 * Cryptographic Provenance Record for Candidate Authorization.
 */
export interface AuthorizationProvenanceRecord {
    readonly provenanceId: AuthorizationProvenanceId;
    readonly tenantPartition: string;
    readonly candidateDraftId: CandidateDraftId;
    readonly evolutionPlanId: EvolutionPlanId;
    readonly authorizationRequestId?: AuthorizationRequestId;
    readonly authorizationDecisionId?: AuthorizationDecisionId;
    readonly activationReadinessId?: ActivationReadinessId;
    readonly eventType: string;
    readonly timestamp: string;
    readonly previousHash: string;
    readonly recordHash: string;
    readonly payloadHash: string;
}
/**
 * Options for candidate authorization services.
 */
export interface PolicyCandidateAuthorizationOptions {
    readonly baseDir?: string;
    readonly isUserStopActive?: () => boolean;
}
