import { type PolicyDecisionProposal, type PolicyRemediationPlan } from './policyDecisionTypes.js';
export declare const HARD_FORBIDDEN_ACTIONS: readonly string[];
export interface PolicyRemediationPlannerOptions {
    readonly isUserStopActive?: () => boolean;
}
export declare class PolicyRemediationPlanner {
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyRemediationPlannerOptions);
    private assertUserStopInactive;
    private validateTenant;
    /**
     * Asserts that none of the proposed actions or target tools violate hard-forbidden immutability.
     * Khẳng định không có hành động hoặc công cụ mục tiêu nào vi phạm tính bất biến của hành động bị cấm tuyệt đối.
     */
    assertHardForbiddenImmutability(targetAction: string): void;
    /**
     * Creates a deterministic, explainable PolicyRemediationPlan from an approved decision proposal.
     * Tạo một PolicyRemediationPlan có tính xác định, có thể giải thích từ một đề xuất quyết định đã duyệt.
     */
    createRemediationPlan(proposal: PolicyDecisionProposal): PolicyRemediationPlan;
}
export declare const globalPolicyRemediationPlanner: PolicyRemediationPlanner;
