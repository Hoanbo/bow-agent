import type { ExecutionReceipt, ExecutionVerificationResult } from '../policyExecution/policyExecutionTypes.js';
import { type PostExecutionReconciliationResult, type PolicyPostExecutionOptions } from './policyPostExecutionTypes.js';
export declare class PolicyPostExecutionReconciliationEngine {
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyPostExecutionOptions);
    private assertUserStopInactive;
    private validateTenant;
    /**
     * Reconciles execution receipt against independent verification result.
     * Điều hòa biên nhận thực thi với kết quả xác minh độc lập.
     */
    reconcile(receipt: ExecutionReceipt, verification: ExecutionVerificationResult): PostExecutionReconciliationResult;
}
export declare const globalPolicyPostExecutionReconciliationEngine: PolicyPostExecutionReconciliationEngine;
