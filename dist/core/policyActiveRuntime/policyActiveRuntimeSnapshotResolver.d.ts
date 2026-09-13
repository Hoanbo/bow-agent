import type { RuntimePolicyResolutionResult, PolicyActiveRuntimeOptions } from './policyActiveRuntimeTypes.js';
import { PolicyActiveRuntimeSyncEngine } from './policyActiveRuntimeSyncEngine.js';
export declare class PolicyActiveRuntimeSnapshotResolver {
    private readonly syncEngine;
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyActiveRuntimeOptions, syncEngine?: PolicyActiveRuntimeSyncEngine);
    private assertUserStopInactive;
    /**
     * Resolves the active runtime policy snapshot for a given tenant / actor.
     * Enforces resolveUserPartition guards against path traversal and reserved device names.
     */
    resolveActivePolicySnapshot(actorTenantId?: string): RuntimePolicyResolutionResult;
}
