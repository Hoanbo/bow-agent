import { type PolicyEvolutionProposal, type CounterfactualSimulationResult, type GuardrailCalibrationResult, type PolicyReviewRecord, type EvolutionVersionId } from './policyEvolutionTypes.js';
import type { AuthorizationToken } from '../world-action/worldActionTypes.js';
import { MasterHumanAuthority } from '../authority/masterHumanAuthority.js';
export interface StagedReviewPackage {
    readonly proposal: PolicyEvolutionProposal;
    readonly simulationResult: CounterfactualSimulationResult;
    readonly guardrailResult: GuardrailCalibrationResult;
    readonly provenanceSha256: string;
    readonly targetPolicyVersionId: EvolutionVersionId;
    readonly stagedAt: number;
}
export interface SubmitReviewInput {
    readonly stagedPackage: StagedReviewPackage;
    readonly decision: 'APPROVED' | 'REJECTED';
    readonly reviewerId: string;
    readonly reviewerRole?: string;
    readonly reviewNotes: string;
    readonly authorizationToken?: AuthorizationToken;
}
export declare class PolicyEvolutionReviewBridge {
    private readonly masterAuthority;
    constructor(masterAuthority?: MasterHumanAuthority);
    /**
     * Stages a complete policy evolution package for supervisory human review.
     * Fails closed if simulation is missing or guardrails failed.
     * Chuẩn bị gói tiến hóa chính sách hoàn chỉnh cho đánh giá của con người giám sát.
     */
    stageForReview(proposal: PolicyEvolutionProposal, simulationResult: CounterfactualSimulationResult, guardrailResult: GuardrailCalibrationResult, provenanceSha256: string, targetPolicyVersionId: EvolutionVersionId): StagedReviewPackage;
    /**
     * Evaluates an explicit human review submission.
     * ANTI-SELF-APPROVAL: Rejects submissions by autonomous agent personas.
     * Requires explicit Master Human Operator authority and cryptographic authorization token when approved.
     * Đánh giá một đệ trình đánh giá của con người rõ ràng.
     * CHỐNG TỰ PHÊ DUYỆT: Từ chối các đệ trình từ các danh tính agent tự trị.
     */
    processReview(input: SubmitReviewInput): PolicyReviewRecord;
}
