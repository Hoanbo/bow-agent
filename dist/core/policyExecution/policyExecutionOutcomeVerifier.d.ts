import { type ExecutionReceipt, type ExecutionVerificationResult } from './policyExecutionTypes.js';
export interface PolicyExecutionOutcomeVerifierOptions {
    readonly baseDir?: string;
    readonly isUserStopActive?: () => boolean;
}
export declare class PolicyExecutionOutcomeVerifier {
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyExecutionOutcomeVerifierOptions);
    private assertUserStopInactive;
    private validateTenant;
    /**
     * Independently verifies an execution receipt against empirical execution evidence.
     * Xác minh độc lập một biên nhận thực thi dựa trên bằng chứng thực thi thực nghiệm.
     */
    verifyOutcome(receipt: ExecutionReceipt): ExecutionVerificationResult;
}
export declare const globalPolicyExecutionOutcomeVerifier: PolicyExecutionOutcomeVerifier;
