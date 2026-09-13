import type { LifecycleReconciliationResult, PolicyActiveLifecycleReconciliationOptions } from './policyActiveLifecycleReconciliationTypes.js';
import { PolicyActiveLifecycleTenantConsistencyEngine } from './policyActiveLifecycleTenantConsistencyEngine.js';
import { PolicyActiveLifecycleStateResolver } from './policyActiveLifecycleStateResolver.js';
import { PolicyActiveLifecycleRuntimeDriftDetector } from './policyActiveLifecycleRuntimeDriftDetector.js';
import { PolicyActiveLifecycleVersionConsistencyEngine } from './policyActiveLifecycleVersionConsistencyEngine.js';
import { PolicyActiveLifecycleRollbackConsistencyEngine } from './policyActiveLifecycleRollbackConsistencyEngine.js';
import { PolicyActiveLifecycleProvenanceConsistencyEngine } from './policyActiveLifecycleProvenanceConsistencyEngine.js';
import type { RuntimePolicySnapshot } from '../policyActiveRuntime/policyActiveRuntimeTypes.js';
export declare class PolicyActiveLifecycleConsistencyEngine {
    private readonly tenantEngine;
    private readonly stateResolver;
    private readonly driftDetector;
    private readonly versionEngine;
    private readonly rollbackEngine;
    private readonly provenanceEngine;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyActiveLifecycleReconciliationOptions, tenantEngine?: PolicyActiveLifecycleTenantConsistencyEngine, stateResolver?: PolicyActiveLifecycleStateResolver, driftDetector?: PolicyActiveLifecycleRuntimeDriftDetector, versionEngine?: PolicyActiveLifecycleVersionConsistencyEngine, rollbackEngine?: PolicyActiveLifecycleRollbackConsistencyEngine, provenanceEngine?: PolicyActiveLifecycleProvenanceConsistencyEngine);
    private assertUserStopInactive;
    /**
     * Performs an end-to-end deterministic reconciliation of active policy lifecycle.
     */
    evaluateLifecycleConsistency(tenantPartition: string, explicitSnapshot?: RuntimePolicySnapshot | null): LifecycleReconciliationResult;
}
