import type { PolicyEvolutionIntakeId, FeedbackReviewId } from '../policyFeedbackReview/policyFeedbackReviewTypes.js';
import type { FeedbackProposalId } from '../policyPostExecution/policyPostExecutionTypes.js';
import type { ExecutionId } from '../policyExecution/policyExecutionTypes.js';
import type { PolicyCandidateId } from '../policyCanary/policyCanaryTypes.js';
export type EvolutionPlanId = string & {
    readonly __brand: unique symbol;
};
export type CandidateSynthesisId = string & {
    readonly __brand: unique symbol;
};
export type CandidateDraftId = string & {
    readonly __brand: unique symbol;
};
export type EvolutionConstraintId = string & {
    readonly __brand: unique symbol;
};
export type EvolutionPlanningProvenanceId = string & {
    readonly __brand: unique symbol;
};
export declare function createEvolutionPlanId(raw: string): EvolutionPlanId;
export declare function createCandidateSynthesisId(raw: string): CandidateSynthesisId;
export declare function createCandidateDraftId(raw: string): CandidateDraftId;
export declare function createEvolutionConstraintId(raw: string): EvolutionConstraintId;
export declare function createEvolutionPlanningProvenanceId(raw: string): EvolutionPlanningProvenanceId;
export type EvolutionPlanType = 'INVESTIGATION_PLAN' | 'CANDIDATE_REEVALUATION_PLAN' | 'CANDIDATE_SYNTHESIS_PLAN' | 'ROLLBACK_REVIEW_PLAN' | 'HUMAN_INVESTIGATION_PLAN';
export type CandidateValidationStatus = 'VALID' | 'DEGRADED' | 'INVALID' | 'BLOCKED';
/**
 * Governed Evolution Plan describing required policy evolution steps.
 * Read-only planning artifact; does not mutate policies or activate candidates.
 */
export interface EvolutionPlan {
    readonly planId: EvolutionPlanId;
    readonly intakeId: PolicyEvolutionIntakeId;
    readonly reviewId: FeedbackReviewId;
    readonly proposalId: FeedbackProposalId;
    readonly tenantPartition: string;
    readonly planType: EvolutionPlanType;
    readonly sourceExecutionId: ExecutionId;
    readonly candidateId?: PolicyCandidateId;
    readonly proposedModifications: readonly string[];
    readonly rationale: string;
    readonly expectedEffects: readonly string[];
    readonly targetPolicyDomain: string;
    readonly createdAt: string;
    readonly isPolicyMutation: false;
    readonly isAutonomousMutation: false;
}
/**
 * Immutable Candidate Policy Draft.
 * Pure draft artifact; never an active policy or candidate promotion.
 */
export interface CandidateDraft {
    readonly candidateDraftId: CandidateDraftId;
    readonly evolutionPlanId: EvolutionPlanId;
    readonly intakeId: PolicyEvolutionIntakeId;
    readonly tenantPartition: string;
    readonly sourcePolicyVersion: string;
    readonly sourceCandidateId?: PolicyCandidateId;
    readonly proposedChanges: Record<string, any>;
    readonly rationale: string;
    readonly expectedEffects: readonly string[];
    readonly constraintsSummary: readonly string[];
    readonly requiredHumanReview: boolean;
    readonly provenanceHeadHash: string;
    readonly createdAt: string;
    readonly isActivePolicy: false;
    readonly isPolicyMutation: false;
    readonly isAutonomousMutation: false;
}
/**
 * Independent validation result for a candidate draft.
 */
export interface CandidateValidationResult {
    readonly valid: boolean;
    readonly candidateDraftId: CandidateDraftId;
    readonly status: CandidateValidationStatus;
    readonly tenantPartition: string;
    readonly issues: readonly string[];
    readonly validatedAt: string;
}
/**
 * Human evolution review requirement specifying mandatory governance checks.
 */
export interface HumanEvolutionReviewRequirement {
    readonly requirementId: string;
    readonly candidateDraftId: CandidateDraftId;
    readonly evolutionPlanId: EvolutionPlanId;
    readonly tenantPartition: string;
    readonly sourcePolicyVersion: string;
    readonly requiredRole: 'MASTER_HUMAN_OPERATOR' | 'SUPERVISOR' | 'OWNER';
    readonly requestedReviewAction: 'APPROVE_FOR_SIMULATION' | 'APPROVE_FOR_STAGING' | 'REJECT_DRAFT';
    readonly expiresAt: string;
    readonly createdAt: string;
    readonly provenanceHeadHash: string;
}
/**
 * Cryptographic provenance record for evolution planning transitions.
 */
export interface EvolutionPlanningProvenanceRecord {
    readonly provenanceId: EvolutionPlanningProvenanceId;
    readonly tenantPartition: string;
    readonly intakeId: PolicyEvolutionIntakeId;
    readonly planId?: EvolutionPlanId;
    readonly candidateDraftId?: CandidateDraftId;
    readonly eventType: string;
    readonly previousHash: string;
    readonly currentHash: string;
    readonly timestamp: string;
    readonly detailsHash?: string;
}
/**
 * Master configuration options for evolution planning.
 */
export interface PolicyEvolutionPlanningOptions {
    readonly baseDir?: string;
    readonly isUserStopActive?: () => boolean;
}
