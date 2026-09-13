import type { SunsetRequest, SunsetEvaluationResult, PolicyActiveRollbackOptions } from './policyActiveRollbackTypes.js';
export declare class PolicySunsetEvaluationEngine {
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyActiveRollbackOptions);
    private assertUserStopInactive;
    private validateTenant;
    /**
     * Independently evaluates a sunset request against active state and requirements.
     */
    evaluate(params: {
        readonly request: SunsetRequest;
        readonly actualCurrentActiveStateId?: string;
        readonly actualCurrentActiveVersion?: string;
        readonly replacementPolicyAvailable?: boolean;
    }): SunsetEvaluationResult;
}
