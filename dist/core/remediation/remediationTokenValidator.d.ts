import type { AuthorizationToken } from '../world-action/worldActionTypes.js';
import { WorldActionAuthorizationEngine } from '../world-action/worldActionAuthorization.js';
import { MasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import type { GovernedRemediationPlan } from './remediationTypes.js';
export declare class RemediationTokenValidationError extends Error {
    readonly code: string;
    constructor(code: string, message: string);
}
export interface ValidateAndConsumeTokenInput {
    readonly token?: AuthorizationToken;
    readonly plan: GovernedRemediationPlan;
    readonly operatorId?: string;
}
export interface ValidatedTokenContext {
    readonly tokenId: string;
    readonly operatorId: string;
    readonly actionId: string;
    readonly targetId: string;
    readonly consumedAt: number;
}
export declare class RemediationTokenValidator {
    private readonly authEngine;
    private readonly masterAuthority;
    constructor(authEngine?: WorldActionAuthorizationEngine, masterAuthority?: MasterHumanAuthority);
    /**
     * Validates cryptographic authorization token and atomically consumes it (single-use guarantee).
     * Thẩm định mã ủy quyền mật mã và tiêu thụ nguyên tử (đảm bảo chỉ dùng một lần).
     */
    validateAndConsume(input: ValidateAndConsumeTokenInput): ValidatedTokenContext;
}
export declare const globalRemediationTokenValidator: RemediationTokenValidator;
