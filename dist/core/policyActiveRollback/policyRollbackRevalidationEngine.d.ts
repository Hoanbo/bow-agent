import type { RollbackRequest, HistoricalPolicyVersion, RollbackRevalidationResult, PolicyActiveRollbackOptions } from './policyActiveRollbackTypes.js';
export declare class PolicyRollbackRevalidationEngine {
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyActiveRollbackOptions);
    private assertUserStopInactive;
    private validateTenant;
    /**
     * Independently revalidates a rollback request against the current active policy and target.
     */
    revalidate(params: {
        readonly request: RollbackRequest;
        readonly target: HistoricalPolicyVersion;
        readonly actualCurrentActiveStateId?: string;
        readonly actualCurrentActiveVersion?: string;
    }): RollbackRevalidationResult;
}
