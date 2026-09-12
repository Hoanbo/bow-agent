// src/core/policyDecision/policyDecisionRuntime.ts
// BOWCON V4.0 — MS-1.3.64: GOVERNED POLICY DECISION & CONTROLLED REMEDIATION LAYER
//
// Governed Policy Decision Runtime (Component 735).
// Master coordinator orchestrating decision proposal synthesis, human reviews,
// remediation planning, authorization gating, provenance tracking, and controlled boundary dispatch.
// Strictly requires human authorization for remediation. Zero autonomous authority.
//
// Thời gian chạy quyết định chính sách có quản trị (Thành phần 735).
// Bộ điều phối chính điều phối tổng hợp đề xuất quyết định, con người xem xét,
// lập kế hoạch khắc phục, cổng ủy quyền, theo dõi nguồn gốc và điều phối ranh giới có kiểm soát.
// Nghiêm ngặt yêu cầu con người ủy quyền để khắc phục. Không có thẩm quyền tự động.
//
// Authority Invariants:
// - Master Decision Coordinator
// - ZERO_AUTONOMOUS_PROMOTION
// - ZERO_AUTONOMOUS_APPROVAL
// - ZERO_AUTONOMOUS_TOKEN_ISSUANCE
// - ZERO_AUTONOMOUS_ROLLBACK
// - ZERO_AUTONOMOUS_CIRCUIT_BREAKER_RESET
// - USER_STOP > ALL_RUNTIME_OPERATIONS
// - STRICT_TENANT_ISOLATION
import crypto from 'node:crypto';
import path from 'node:path';
import { createRemediationRequestId, } from './policyDecisionTypes.js';
import { globalPolicyDecisionEngine } from './policyDecisionEngine.js';
import { globalPolicyRemediationPlanner } from './policyRemediationPlanner.js';
import { globalPolicyDecisionAuthorizationGate } from './policyDecisionAuthorizationGate.js';
import { globalPolicyControlledRemediationBoundary } from './policyControlledRemediationBoundary.js';
import { globalPolicyDecisionProvenanceEngine } from './policyDecisionProvenanceEngine.js';
import { globalPolicyDecisionAuditEngine } from './policyDecisionAuditEngine.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
export class PolicyDecisionRuntime {
    decisionEngine;
    remediationPlanner;
    authorizationGate;
    remediationBoundary;
    provenanceEngine;
    auditEngine;
    isUserStopActiveFn;
    // Map<tenantPartition, Map<requestId, RemediationRequest>>
    remediationRequests = new Map();
    constructor(options) {
        this.decisionEngine = options?.decisionEngine ?? globalPolicyDecisionEngine;
        this.remediationPlanner = options?.remediationPlanner ?? globalPolicyRemediationPlanner;
        this.authorizationGate = options?.authorizationGate ?? globalPolicyDecisionAuthorizationGate;
        this.remediationBoundary = options?.remediationBoundary ?? globalPolicyControlledRemediationBoundary;
        this.provenanceEngine = options?.provenanceEngine ?? globalPolicyDecisionProvenanceEngine;
        this.auditEngine = options?.auditEngine ?? globalPolicyDecisionAuditEngine;
        this.isUserStopActiveFn = options?.isUserStopActive;
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Decision runtime operations suspended by USER_STOP');
        }
    }
    validateTenant(tenantPartition) {
        if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
            throw new Error('RUNTIME_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
        }
        resolveUserPartition(tenantPartition.trim(), path.resolve(process.cwd(), 'data', 'partitions'));
    }
    getRemediationBucket(tenantPartition) {
        let bucket = this.remediationRequests.get(tenantPartition);
        if (!bucket) {
            bucket = new Map();
            this.remediationRequests.set(tenantPartition, bucket);
        }
        return bucket;
    }
    /**
     * Synthesizes a new decision proposal from an investigation summary.
     * Tổng hợp một đề xuất quyết định mới từ tóm tắt điều tra.
     */
    createProposalFromInvestigation(summary) {
        this.assertUserStopInactive();
        this.validateTenant(summary.tenantPartition);
        const proposal = this.decisionEngine.generateProposal(summary);
        // Record provenance transition
        this.provenanceEngine.recordTransition({
            decisionId: proposal.decisionId,
            proposalId: proposal.proposalId,
            tenantPartition: proposal.tenantPartition,
            eventType: 'PROPOSAL_CREATED',
            metadata: {
                recommendation: proposal.recommendation,
                candidateId: proposal.candidateId,
                integrityStatus: summary.integrityResult.status,
            },
        });
        // Audit proposal creation
        this.auditEngine.recordAuditEvent({
            eventType: 'PROPOSAL_CREATED',
            tenantPartition: proposal.tenantPartition,
            proposalId: proposal.proposalId,
            decisionId: proposal.decisionId,
            candidateId: proposal.candidateId,
            policyDecision: 'PERMIT',
            executionStatus: 'SUCCESS',
            details: { recommendation: proposal.recommendation, rationale: proposal.rationale },
        });
        return proposal;
    }
    /**
     * Submits an operator review (approval or rejection) for a decision proposal.
     * Gửi đánh giá của người vận hành (phê duyệt hoặc từ chối) cho đề xuất quyết định.
     */
    reviewProposal(tenantPartition, proposalId, action, operatorUserId, rejectionReason) {
        this.assertUserStopInactive();
        this.validateTenant(tenantPartition);
        if (action === 'APPROVE') {
            const approved = this.decisionEngine.approveProposal(tenantPartition, proposalId, operatorUserId);
            this.provenanceEngine.recordTransition({
                decisionId: approved.decisionId,
                proposalId: approved.proposalId,
                tenantPartition: approved.tenantPartition,
                eventType: 'PROPOSAL_APPROVED',
                operatorUserId,
            });
            this.auditEngine.recordAuditEvent({
                eventType: 'PROPOSAL_APPROVED',
                tenantPartition,
                proposalId,
                decisionId: approved.decisionId,
                candidateId: approved.candidateId,
                operatorUserId,
                policyDecision: 'PERMIT',
                executionStatus: 'SUCCESS',
            });
            return approved;
        }
        else {
            const reason = rejectionReason ?? 'OPERATOR_REJECTED';
            const rejected = this.decisionEngine.rejectProposal(tenantPartition, proposalId, operatorUserId, reason);
            this.provenanceEngine.recordTransition({
                decisionId: rejected.decisionId,
                proposalId: rejected.proposalId,
                tenantPartition: rejected.tenantPartition,
                eventType: 'PROPOSAL_REJECTED',
                operatorUserId,
                metadata: { rejectionReason: reason },
            });
            this.auditEngine.recordAuditEvent({
                eventType: 'PROPOSAL_REJECTED',
                tenantPartition,
                proposalId,
                decisionId: rejected.decisionId,
                candidateId: rejected.candidateId,
                operatorUserId,
                policyDecision: 'DENY',
                executionStatus: 'BLOCKED',
                details: { rejectionReason: reason },
            });
            return rejected;
        }
    }
    /**
     * Plans remediation actions for an approved proposal.
     * Lập kế hoạch hành động khắc phục cho đề xuất đã duyệt.
     */
    planRemediation(tenantPartition, proposalId) {
        this.assertUserStopInactive();
        this.validateTenant(tenantPartition);
        const proposal = this.decisionEngine.getProposal(tenantPartition, proposalId);
        const plan = this.remediationPlanner.createRemediationPlan(proposal);
        this.provenanceEngine.recordTransition({
            decisionId: proposal.decisionId,
            proposalId: proposal.proposalId,
            tenantPartition: proposal.tenantPartition,
            eventType: 'REMEDIATION_PLANNED',
            metadata: { planId: plan.planId, remediationType: plan.remediationType, blastRadius: plan.blastRadius },
        });
        this.auditEngine.recordAuditEvent({
            eventType: 'REMEDIATION_PLANNED',
            tenantPartition,
            proposalId,
            decisionId: proposal.decisionId,
            candidateId: proposal.candidateId,
            policyDecision: 'PERMIT',
            executionStatus: 'SUCCESS',
            details: { planId: plan.planId, remediationType: plan.remediationType, blastRadius: plan.blastRadius },
        });
        return plan;
    }
    /**
     * Authorizes and dispatches a controlled remediation request through the boundary.
     * Requires a valid, unexpired, single-use human operator authorization token.
     *
     * Ủy quyền và điều phối yêu cầu khắc phục có kiểm soát qua ranh giới.
     * Yêu cầu mã ủy quyền của người vận hành con người hợp lệ, chưa hết hạn, dùng một lần.
     */
    authorizeAndDispatchRemediation(input) {
        this.assertUserStopInactive();
        this.validateTenant(input.tenantPartition);
        const proposal = this.decisionEngine.getProposal(input.tenantPartition, input.proposalId);
        if (proposal.state !== 'APPROVED') {
            throw new Error(`UNAPPROVED_PROPOSAL_CANNOT_EXECUTE: Proposal '${input.proposalId}' must be APPROVED before remediation (current: ${proposal.state})`);
        }
        const plan = this.remediationPlanner.createRemediationPlan(proposal);
        const requestId = createRemediationRequestId(`rem_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`);
        const remediationRequest = {
            requestId,
            proposalId: proposal.proposalId,
            tenantPartition: input.tenantPartition,
            candidateId: proposal.candidateId,
            state: 'AUTHORIZATION_REQUIRED',
            plan,
        };
        // 1. Validate and consume token
        const authResult = this.authorizationGate.validateAndConsumeToken(input.token, proposal, remediationRequest);
        const authorizedRequest = Object.freeze({
            ...remediationRequest,
            state: 'AUTHORIZED',
            authorizationToken: input.token,
            authorizedAt: authResult.consumedAt,
        });
        this.getRemediationBucket(input.tenantPartition).set(requestId, authorizedRequest);
        this.provenanceEngine.recordTransition({
            decisionId: proposal.decisionId,
            proposalId: proposal.proposalId,
            tenantPartition: proposal.tenantPartition,
            eventType: 'AUTHORIZATION_ACCEPTED',
            operatorUserId: authResult.operatorUserId,
            metadata: { requestId, tokenId: input.token.tokenId },
        });
        this.auditEngine.recordAuditEvent({
            eventType: 'AUTHORIZATION_ACCEPTED',
            tenantPartition: input.tenantPartition,
            proposalId: proposal.proposalId,
            requestId,
            decisionId: proposal.decisionId,
            candidateId: proposal.candidateId,
            operatorUserId: authResult.operatorUserId,
            policyDecision: 'PERMIT',
            executionStatus: 'SUCCESS',
            details: { tokenId: input.token.tokenId },
        });
        // 2. Dispatch via Controlled Remediation Boundary
        const dispatchResult = this.remediationBoundary.dispatchRemediation(authorizedRequest);
        this.provenanceEngine.recordTransition({
            decisionId: proposal.decisionId,
            proposalId: proposal.proposalId,
            tenantPartition: proposal.tenantPartition,
            eventType: 'REMEDIATION_DISPATCHED',
            operatorUserId: authResult.operatorUserId,
            metadata: { requestId, envelopeId: dispatchResult.envelope?.envelopeId },
        });
        this.auditEngine.recordAuditEvent({
            eventType: 'REMEDIATION_DISPATCHED',
            tenantPartition: input.tenantPartition,
            proposalId: proposal.proposalId,
            requestId,
            decisionId: proposal.decisionId,
            candidateId: proposal.candidateId,
            operatorUserId: authResult.operatorUserId,
            policyDecision: 'PERMIT',
            executionStatus: 'SUCCESS',
            details: { envelopeId: dispatchResult.envelope?.envelopeId },
        });
        return dispatchResult;
    }
    /**
     * Retrieves proposal by tenant and ID.
     * Lấy đề xuất theo người thuê và ID.
     */
    getProposal(tenantPartition, proposalId) {
        this.assertUserStopInactive();
        this.validateTenant(tenantPartition);
        return this.decisionEngine.getProposal(tenantPartition, proposalId);
    }
    /**
     * Verifies the unbroken cryptographic provenance chain for a decision.
     * Xác minh chuỗi nguồn gốc mật mã không bị phá vỡ cho một quyết định.
     */
    verifyDecisionProvenance(decisionId) {
        return this.provenanceEngine.verifyChain(decisionId);
    }
}
export const globalPolicyDecisionRuntime = new PolicyDecisionRuntime();
