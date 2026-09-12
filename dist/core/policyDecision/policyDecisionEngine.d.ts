import { type DecisionProposalId, type PolicyDecisionProposal, type DecisionRejectionReason } from './policyDecisionTypes.js';
import type { InvestigationSummary } from '../policyEvidence/policyEvidenceQueryTypes.js';
export declare const DEFAULT_MAX_EVIDENCE_STALENESS_MS = 3600000;
export declare const DEFAULT_PROPOSAL_TTL_MS = 86400000;
export interface PolicyDecisionEngineOptions {
    readonly isUserStopActive?: () => boolean;
    readonly maxStalenessMs?: number;
    readonly proposalTtlMs?: number;
}
export declare class PolicyDecisionEngine {
    private readonly isUserStopActiveFn?;
    private readonly maxStalenessMs;
    private readonly proposalTtlMs;
    private readonly proposals;
    constructor(options?: PolicyDecisionEngineOptions);
    private assertUserStopInactive;
    private validateTenant;
    private getTenantBucket;
    /**
     * Evaluates verified investigation summary and generates a deterministic PolicyDecisionProposal.
     * Đánh giá tóm tắt điều tra đã xác minh và tạo một PolicyDecisionProposal có tính xác định.
     */
    generateProposal(summary: InvestigationSummary): PolicyDecisionProposal;
    /**
     * Retrieves a proposal by tenant and ID.
     * Lấy đề xuất theo người thuê và mã định danh.
     */
    getProposal(tenantPartition: string, proposalId: DecisionProposalId): PolicyDecisionProposal;
    /**
     * Explicitly approves a decision proposal by an authorized human operator.
     * Phê duyệt rõ ràng đề xuất quyết định bởi người vận hành con người được ủy quyền.
     */
    approveProposal(tenantPartition: string, proposalId: DecisionProposalId, operatorUserId: string): PolicyDecisionProposal;
    /**
     * Explicitly rejects a decision proposal.
     * Từ chối rõ ràng một đề xuất quyết định.
     */
    rejectProposal(tenantPartition: string, proposalId: DecisionProposalId, operatorUserId: string, reason: DecisionRejectionReason): PolicyDecisionProposal;
    /**
     * Cancels a proposal, e.g. when cancelled by USER_STOP or superseded.
     * Hủy đề xuất, ví dụ khi bị hủy bởi USER_STOP hoặc bị thay thế.
     */
    cancelProposal(tenantPartition: string, proposalId: DecisionProposalId, reason: string): PolicyDecisionProposal;
}
export declare const globalPolicyDecisionEngine: PolicyDecisionEngine;
