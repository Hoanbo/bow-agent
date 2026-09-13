import type { RollbackRequest, HistoricalPolicyVersion, GovernedRollbackAuthorization, RollbackCommitResult, SunsetRequest, SunsetCommitResult, RecoveryRequest, RecoveryCommitResult, PolicyActiveRollbackOptions } from './policyActiveRollbackTypes.js';
import { PolicyActivationStateStore } from '../policyStagedActivation/policyActivationStateStore.js';
import { PolicyActiveRollbackStore } from './policyActiveRollbackStore.js';
export declare class PolicyRollbackStateTransitionEngine {
    private readonly isUserStopActiveFn?;
    private readonly stateStore;
    private readonly rollbackStore;
    constructor(options?: PolicyActiveRollbackOptions, stateStore?: PolicyActivationStateStore, rollbackStore?: PolicyActiveRollbackStore);
    private assertUserStopInactive;
    /**
     * Commits an atomic governed rollback to a historical policy target.
     */
    commitRollback(params: {
        readonly request: RollbackRequest;
        readonly target: HistoricalPolicyVersion;
        readonly authorization: GovernedRollbackAuthorization;
    }): RollbackCommitResult;
    /**
     * Commits an atomic governed sunset / retirement.
     */
    commitSunset(params: {
        readonly request: SunsetRequest;
        readonly authorization: GovernedRollbackAuthorization;
        readonly replacementTarget?: HistoricalPolicyVersion;
    }): SunsetCommitResult;
    /**
     * Commits an atomic governed recovery to a verified historical policy version.
     */
    commitRecovery(params: {
        readonly request: RecoveryRequest;
        readonly target: HistoricalPolicyVersion;
        readonly authorization: GovernedRollbackAuthorization;
    }): RecoveryCommitResult;
}
