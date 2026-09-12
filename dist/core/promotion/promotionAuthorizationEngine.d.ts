import { type PromotionProposal, type PromotionApprovalRecord } from './promotionTypes.js';
import { WorldActionAuthorizationEngine } from '../world-action/worldActionAuthorization.js';
import type { AuthorizationToken } from '../world-action/worldActionTypes.js';
export interface IssuePromotionTokenInput {
    readonly proposal: PromotionProposal;
    readonly approval: PromotionApprovalRecord;
    readonly operatorId: string;
    readonly ttlMs?: number;
}
export declare class PromotionAuthorizationEngine {
    private readonly authEngine;
    constructor(authEngine?: WorldActionAuthorizationEngine);
    /**
     * Issues an execution authorization token for an approved promotion proposal.
     * Cấp mã ủy quyền thực thi cho một đề xuất xúc tiến đã được phê duyệt.
     */
    issuePromotionToken(input: IssuePromotionTokenInput): AuthorizationToken;
    /**
     * Validates that an authorization token is valid and legally authorizes the promotion action.
     * Xác thực rằng mã ủy quyền hợp lệ và cấp quyền hợp pháp cho hành động xúc tiến.
     */
    validatePromotionToken(token: AuthorizationToken, proposal: PromotionProposal): boolean;
}
