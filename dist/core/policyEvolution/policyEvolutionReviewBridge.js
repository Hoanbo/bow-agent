// src/core/policyEvolution/policyEvolutionReviewBridge.ts
// BOWCON V4.0 — MS-1.3.58: GOVERNED OPERATIONAL POLICY EVOLUTION, GUARDRAIL CALIBRATION & COUNTERFACTUAL RESILIENCE VERIFICATION PIPELINE
//
// Governed human review bridge for operational policy evolution.
// Prepares staged policy evolution packages requiring explicit Master Human Operator review and sign-off.
// Authority Invariant: Level 1 → Level 2 Governance Bridge.
// Anti-Self-Approval: The autonomous agent can NEVER approve its own proposal.
// Cầu nối đánh giá của con người có quản trị cho tiến hóa chính sách vận hành.
// Chuẩn bị các gói tiến hóa chính sách được chuẩn bị sẵn yêu cầu sự đánh giá và ký duyệt rõ ràng của Master Human Operator.
// Bất biến chống tự phê duyệt: Agent tự trị TUYỆT ĐỐI KHÔNG THỂ tự phê duyệt đề xuất của chính mình.
import { createReviewId, } from './policyEvolutionTypes.js';
import { MasterHumanAuthority } from '../authority/masterHumanAuthority.js';
export class PolicyEvolutionReviewBridge {
    masterAuthority;
    constructor(masterAuthority = new MasterHumanAuthority()) {
        this.masterAuthority = masterAuthority;
    }
    /**
     * Stages a complete policy evolution package for supervisory human review.
     * Fails closed if simulation is missing or guardrails failed.
     * Chuẩn bị gói tiến hóa chính sách hoàn chỉnh cho đánh giá của con người giám sát.
     */
    stageForReview(proposal, simulationResult, guardrailResult, provenanceSha256, targetPolicyVersionId) {
        if (!proposal || !proposal.proposalId) {
            throw new Error('STAGING_FAILED: Valid PolicyEvolutionProposal is required.');
        }
        if (!simulationResult || !simulationResult.simulationId) {
            throw new Error('STAGING_FAILED: CounterfactualSimulationResult is required before human review.');
        }
        if (!guardrailResult || !guardrailResult.passed) {
            throw new Error(`STAGING_BLOCKED: Guardrails failed calibration (${guardrailResult?.rejectionReasons?.join(', ') || 'Failed'}). Cannot present unsafe proposal to human gate.`);
        }
        if (!provenanceSha256 || provenanceSha256.length !== 64) {
            throw new Error('STAGING_FAILED: Cryptographic provenanceSha256 seal is required for review package.');
        }
        return Object.freeze({
            proposal,
            simulationResult,
            guardrailResult,
            provenanceSha256,
            targetPolicyVersionId,
            stagedAt: Date.now(),
        });
    }
    /**
     * Evaluates an explicit human review submission.
     * ANTI-SELF-APPROVAL: Rejects submissions by autonomous agent personas.
     * Requires explicit Master Human Operator authority and cryptographic authorization token when approved.
     * Đánh giá một đệ trình đánh giá của con người rõ ràng.
     * CHỐNG TỰ PHÊ DUYỆT: Từ chối các đệ trình từ các danh tính agent tự trị.
     */
    processReview(input) {
        const { stagedPackage, decision, reviewerId, reviewerRole, reviewNotes, authorizationToken } = input;
        // 1. Anti-Self-Approval Gate: Agent personas can NEVER approve policy mutations
        const normalizedReviewer = reviewerId.trim().toUpperCase();
        const normalizedRole = (reviewerRole ?? '').trim().toUpperCase();
        if (normalizedReviewer.includes('AGENT') ||
            normalizedReviewer.includes('BOT') ||
            normalizedReviewer === 'SYSTEM' ||
            normalizedReviewer === 'AI_COFOUNDER' ||
            normalizedReviewer.includes('AUTONOMOUS') ||
            normalizedReviewer.includes('RUNTIME') ||
            normalizedRole.includes('AGENT') ||
            normalizedRole.includes('BOT')) {
            throw new Error(`ANTI_SELF_APPROVAL_VIOLATION: Autonomous agent persona '${reviewerId}' cannot approve policy evolution proposals. Explicit human review is mandatory.`);
        }
        // 2. Validate reviewer role authority
        const effectiveRole = reviewerRole ?? 'MASTER_HUMAN_OPERATOR';
        if (effectiveRole !== 'MASTER_HUMAN_OPERATOR' && effectiveRole !== 'SUPERVISOR' && effectiveRole !== 'OWNER') {
            throw new Error(`UNAUTHORIZED_REVIEWER_ROLE: Reviewer role '${effectiveRole}' lacks authority to approve policy evolution.`);
        }
        // 3. If approved, cryptographic single-use token must be supplied
        if (decision === 'APPROVED') {
            if (!authorizationToken || !authorizationToken.tokenId) {
                throw new Error('APPROVAL_REJECTED: Approved policy evolution requires a valid AuthorizationToken.');
            }
        }
        const reviewId = createReviewId(`rev_${Date.now()}_${stagedPackage.proposal.proposalId.slice(-8)}`);
        return {
            reviewId,
            proposalId: stagedPackage.proposal.proposalId,
            decision,
            reviewedBy: reviewerId,
            reviewNotes,
            authorizationToken,
            reviewedAt: Date.now(),
        };
    }
}
