import type { HistoricalPolicyVersion, PolicyActiveRollbackOptions } from './policyActiveRollbackTypes.js';
import { PolicyActiveRollbackStore } from './policyActiveRollbackStore.js';
export interface TargetResolutionResult {
    readonly success: boolean;
    readonly target: HistoricalPolicyVersion | null;
    readonly tenantPartition: string;
    readonly failureReason?: string;
    readonly resolvedAt: string;
}
export declare class PolicyRollbackTargetResolver {
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    private readonly store;
    constructor(options?: PolicyActiveRollbackOptions, store?: PolicyActiveRollbackStore);
    private assertUserStopInactive;
    private validateTenant;
    /**
     * Resolves a historical rollback target explicitly by version or targetId.
     */
    resolveTarget(params: {
        readonly tenantPartition: string;
        readonly targetPolicyVersion?: string;
        readonly targetId?: string;
        readonly currentActiveVersion?: string;
    }): TargetResolutionResult;
}
