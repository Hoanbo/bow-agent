import { type DecisionId, type DecisionProposalId, type PolicyDecisionProposal, type PolicyRemediationPlan, type PolicyDecisionAuthorizationToken, type ControlledRemediationResult, type DecisionRejectionReason } from './policyDecisionTypes.js';
import type { InvestigationSummary } from '../policyEvidence/policyEvidenceQueryTypes.js';
import { PolicyDecisionEngine } from './policyDecisionEngine.js';
import { PolicyRemediationPlanner } from './policyRemediationPlanner.js';
import { PolicyDecisionAuthorizationGate } from './policyDecisionAuthorizationGate.js';
import { PolicyControlledRemediationBoundary } from './policyControlledRemediationBoundary.js';
import { PolicyDecisionProvenanceEngine } from './policyDecisionProvenanceEngine.js';
import { PolicyDecisionAuditEngine } from './policyDecisionAuditEngine.js';
export interface PolicyDecisionRuntimeOptions {
    readonly decisionEngine?: PolicyDecisionEngine;
    readonly remediationPlanner?: PolicyRemediationPlanner;
    readonly authorizationGate?: PolicyDecisionAuthorizationGate;
    readonly remediationBoundary?: PolicyControlledRemediationBoundary;
    readonly provenanceEngine?: PolicyDecisionProvenanceEngine;
    readonly auditEngine?: PolicyDecisionAuditEngine;
    readonly isUserStopActive?: () => boolean;
}
export declare class PolicyDecisionRuntime {
    private readonly decisionEngine;
    private readonly remediationPlanner;
    private readonly authorizationGate;
    private readonly remediationBoundary;
    private readonly provenanceEngine;
    private readonly auditEngine;
    private readonly isUserStopActiveFn?;
    private readonly remediationRequests;
    constructor(options?: PolicyDecisionRuntimeOptions);
    private assertUserStopInactive;
    private validateTenant;
    private getRemediationBucket;
    /**
     * Synthesizes a new decision proposal from an investigation summary.
     * Tổng hợp một đề xuất quyết định mới từ tóm tắt điều tra.
     */
    createProposalFromInvestigation(summary: InvestigationSummary): PolicyDecisionProposal;
    /**
     * Submits an operator review (approval or rejection) for a decision proposal.
     * Gửi đánh giá của người vận hành (phê duyệt hoặc từ chối) cho đề xuất quyết định.
     */
    reviewProposal(tenantPartition: string, proposalId: DecisionProposalId, action: 'APPROVE' | 'REJECT', operatorUserId: string, rejectionReason?: DecisionRejectionReason): PolicyDecisionProposal;
    /**
     * Plans remediation actions for an approved proposal.
     * Lập kế hoạch hành động khắc phục cho đề xuất đã duyệt.
     */
    planRemediation(tenantPartition: string, proposalId: DecisionProposalId): PolicyRemediationPlan;
    /**
     * Authorizes and dispatches a controlled remediation request through the boundary.
     * Requires a valid, unexpired, single-use human operator authorization token.
     *
     * Ủy quyền và điều phối yêu cầu khắc phục có kiểm soát qua ranh giới.
     * Yêu cầu mã ủy quyền của người vận hành con người hợp lệ, chưa hết hạn, dùng một lần.
     */
    authorizeAndDispatchRemediation(input: {
        readonly tenantPartition: string;
        readonly proposalId: DecisionProposalId;
        readonly token: PolicyDecisionAuthorizationToken;
    }): ControlledRemediationResult;
    /**
     * Retrieves proposal by tenant and ID.
     * Lấy đề xuất theo người thuê và ID.
     */
    getProposal(tenantPartition: string, proposalId: DecisionProposalId): PolicyDecisionProposal;
    /**
     * Verifies the unbroken cryptographic provenance chain for a decision.
     * Xác minh chuỗi nguồn gốc mật mã không bị phá vỡ cho một quyết định.
     */
    verifyDecisionProvenance(decisionId: DecisionId): {
        readonly valid: boolean;
        readonly recordCount: number;
        readonly headHash: string;
        readonly reason?: string;
    };
}
export declare const globalPolicyDecisionRuntime: PolicyDecisionRuntime;
