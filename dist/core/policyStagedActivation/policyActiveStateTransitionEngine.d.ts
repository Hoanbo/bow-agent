import type { StagedPolicy, GovernedActivationAuthorization, ActivePolicyState, PolicyStagedActivationOptions } from './policyStagedActivationTypes.js';
import type { PolicyActivationStateStore } from './policyActivationStateStore.js';
export declare class PolicyActiveStateTransitionEngine {
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    private readonly stateStore;
    constructor(options: PolicyStagedActivationOptions | undefined, stateStore: PolicyActivationStateStore);
    private assertUserStopInactive;
    private validateTenant;
    /**
     * Commits the governed active state transition from StagedPolicy to ActivePolicyState.
     */
    commitActivation(params: {
        readonly stagedPolicy: StagedPolicy;
        readonly governedAuthorization: GovernedActivationAuthorization;
    }): ActivePolicyState;
}
