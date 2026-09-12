import { type ReleaseExecutionRequest, type ReleaseExecutionApprovalBinding, type ReleaseExecutionAuthorizationBinding } from './releaseExecutionTypes.js';
import type { ReleaseCandidate } from '../release/releaseTypes.js';
import { WorldActionAuthorizationEngine } from '../world-action/worldActionAuthorization.js';
import type { AuthorizationToken } from '../world-action/worldActionTypes.js';
export interface IssueReleaseTokenInput {
    readonly request: ReleaseExecutionRequest;
    readonly candidate: ReleaseCandidate;
    readonly approval: ReleaseExecutionApprovalBinding;
    readonly ttlMs?: number;
}
export declare class ReleaseExecutionAuthorizationBridge {
    private readonly authEngine;
    private consumedTokens;
    constructor(authEngine?: WorldActionAuthorizationEngine);
    /**
     * Issues a cryptographically bound, single-use WorldActionAuthorization token.
     * Cấp mã WorldActionAuthorization sử dụng một lần được liên kết mã hóa.
     */
    issueReleaseToken(input: IssueReleaseTokenInput): {
        readonly token: AuthorizationToken;
        readonly binding: ReleaseExecutionAuthorizationBinding;
    };
    /**
     * Validates and consumes the execution token for the given request and candidate.
     * Anti-replay guarantee: token can only be validated and consumed once.
     *
     * Xác thực và tiêu thụ mã thực thi cho yêu cầu và ứng viên được cung cấp.
     * Đảm bảo chống phát lại: mã chỉ có thể được xác thực và tiêu thụ một lần.
     */
    validateAndConsumeToken(token: AuthorizationToken, request: ReleaseExecutionRequest, candidate: ReleaseCandidate): boolean;
}
