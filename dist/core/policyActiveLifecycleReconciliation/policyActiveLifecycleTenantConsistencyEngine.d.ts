import type { LifecycleDriftRecord, LifecycleBoundaryCheckResult, PolicyActiveLifecycleReconciliationOptions } from './policyActiveLifecycleReconciliationTypes.js';
export interface TenantConsistencyCheckResult {
    readonly valid: boolean;
    readonly sanitizedPartitionKey: string;
    readonly detectedDrifts: readonly LifecycleDriftRecord[];
    readonly boundaryChecks: readonly LifecycleBoundaryCheckResult[];
    readonly blockingReasons: readonly string[];
}
export declare class PolicyActiveLifecycleTenantConsistencyEngine {
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyActiveLifecycleReconciliationOptions);
    private assertUserStopInactive;
    /**
     * Verifies that a tenant partition is safe, legal, and isolated.
     */
    verifyTenantPartition(tenantPartition: string): TenantConsistencyCheckResult;
}
