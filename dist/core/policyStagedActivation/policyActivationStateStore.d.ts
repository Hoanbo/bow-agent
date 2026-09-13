import type { StagedPolicy, ActivePolicyState, PolicyStagedActivationOptions } from './policyStagedActivationTypes.js';
import { DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export declare class PolicyActivationStateStore {
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    private readonly sanitizer;
    private readonly stagedPolicies;
    private readonly candidateStagedLookup;
    private readonly activePolicies;
    constructor(options?: PolicyStagedActivationOptions, sanitizer?: DiagnosisSanitizer);
    private assertUserStopInactive;
    private getTenantStorageDir;
    private loadTenantStateIfEmpty;
    private persistStagedPolicies;
    private persistActivePolicy;
    /**
     * Saves a staged policy record with anti-duplicate idempotency.
     */
    saveStagedPolicy(staged: StagedPolicy): StagedPolicy;
    /**
     * Saves and updates the active policy record for a tenant.
     */
    saveActivePolicy(activeState: ActivePolicyState): ActivePolicyState;
    /**
     * Retrieves a staged policy by candidateDraftId.
     */
    getStagedByCandidate(tenantPartition: string, candidateDraftId: string): StagedPolicy | null;
    /**
     * Retrieves the current active policy state for a tenant.
     */
    getActivePolicy(tenantPartition: string): ActivePolicyState | null;
}
