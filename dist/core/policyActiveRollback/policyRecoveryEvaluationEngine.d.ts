import type { RecoveryRequest, HistoricalPolicyVersion, RecoveryEvaluationResult, PolicyActiveRollbackOptions } from './policyActiveRollbackTypes.js';
export declare class PolicyRecoveryEvaluationEngine {
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyActiveRollbackOptions);
    private assertUserStopInactive;
    private validateTenant;
    /**
     * Independently evaluates a recovery request against a candidate recovery target.
     */
    evaluate(params: {
        readonly request: RecoveryRequest;
        readonly target: HistoricalPolicyVersion;
        readonly currentActiveVersion?: string;
    }): RecoveryEvaluationResult;
}
