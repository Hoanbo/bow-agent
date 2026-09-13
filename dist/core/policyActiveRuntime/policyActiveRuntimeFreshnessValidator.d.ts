import type { ActivePolicyState } from '../policyStagedActivation/policyStagedActivationTypes.js';
import type { RuntimePolicyFreshnessStatus, PolicyActiveRuntimeOptions } from './policyActiveRuntimeTypes.js';
export interface FreshnessValidationResult {
    readonly status: RuntimePolicyFreshnessStatus;
    readonly isValid: boolean;
    readonly issues: readonly string[];
    readonly validatedVersion: string;
}
export declare class PolicyActiveRuntimeFreshnessValidator {
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyActiveRuntimeOptions);
    private assertUserStopInactive;
    /**
     * Evaluates the integrity and freshness of an ActivePolicyState record.
     * Compares against current known version if one exists to detect stale/superseded policies.
     */
    validateFreshness(activeState: ActivePolicyState | null | undefined, tenantPartition: string, currentKnownVersion?: string): FreshnessValidationResult;
    /**
     * Helper to check if incoming version is older than known version.
     */
    private isVersionStale;
}
