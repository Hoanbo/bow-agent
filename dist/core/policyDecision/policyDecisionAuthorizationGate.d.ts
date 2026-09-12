import { type PolicyDecisionProposal, type PolicyDecisionAuthorizationToken, type RemediationRequest } from './policyDecisionTypes.js';
export interface PolicyDecisionAuthorizationGateOptions {
    readonly isUserStopActive?: () => boolean;
}
export declare class PolicyDecisionAuthorizationGate {
    private readonly isUserStopActiveFn?;
    private readonly consumedTokenIds;
    constructor(options?: PolicyDecisionAuthorizationGateOptions);
    private assertUserStopInactive;
    private validateTenant;
    /**
     * Validates and atomically consumes a human authorization token for a proposal and remediation request.
     * Thẩm định và tiêu thụ nguyên tử token ủy quyền con người cho đề xuất và yêu cầu khắc phục.
     */
    validateAndConsumeToken(token: PolicyDecisionAuthorizationToken, proposal: PolicyDecisionProposal, remediationRequest?: RemediationRequest): {
        readonly valid: boolean;
        readonly operatorUserId: string;
        readonly consumedAt: string;
    };
    /**
     * Checks if a token ID has already been consumed.
     * Kiểm tra xem tokenId đã được tiêu thụ chưa.
     */
    isTokenConsumed(tokenId: string): boolean;
    /**
     * Clears consumed tokens for testing.
     * Xóa danh sách token đã tiêu thụ phục vụ kiểm thử.
     */
    clear(): void;
}
export declare const globalPolicyDecisionAuthorizationGate: PolicyDecisionAuthorizationGate;
