import type { StagedPolicy, ActivationPreflightResult, PolicyStagedActivationOptions } from './policyStagedActivationTypes.js';
import type { PolicyActivationStateStore } from './policyActivationStateStore.js';
export declare class PolicyActivationPreflightEngine {
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    private readonly stateStore?;
    constructor(options?: PolicyStagedActivationOptions, stateStore?: PolicyActivationStateStore);
    private assertUserStopInactive;
    private validateTenant;
    /**
     * Runs deterministic preflight verification for a staged policy.
     */
    runPreflight(stagedPolicy: StagedPolicy): ActivationPreflightResult;
}
