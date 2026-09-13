import type { RuntimePolicySnapshot } from '../policyActiveRuntime/policyActiveRuntimeTypes.js';
import type { LifecycleReconciliationResult, ReconciliationProvenanceRecord, PolicyActiveLifecycleReconciliationOptions } from './policyActiveLifecycleReconciliationTypes.js';
import { PolicyActiveLifecycleConsistencyEngine } from './policyActiveLifecycleConsistencyEngine.js';
import { PolicyActiveLifecycleReconciliationAuditEngine } from './policyActiveLifecycleReconciliationAuditEngine.js';
export declare class PolicyActiveLifecycleReconciliationRuntime {
    private readonly consistencyEngine;
    private readonly auditEngine;
    private readonly isUserStopActiveFn?;
    private readonly provenanceChains;
    constructor(options?: PolicyActiveLifecycleReconciliationOptions, consistencyEngine?: PolicyActiveLifecycleConsistencyEngine, auditEngine?: PolicyActiveLifecycleReconciliationAuditEngine);
    private assertUserStopInactive;
    private appendProvenanceRecord;
    /**
     * Reconciles active policy lifecycle state against runtime, PDP, PEP, rollback, and provenance.
     * Strictly read-only; never mutates policy or autonomously repairs drift.
     */
    reconcileLifecycle(tenantPartition: string, options?: {
        explicitSnapshot?: RuntimePolicySnapshot | null;
        actorUserId?: string;
    }): LifecycleReconciliationResult;
    /**
     * Fast Boolean check: returns true if lifecycle is completely consistent and 0 drifts detected.
     */
    verifyConsistency(tenantPartition: string): boolean;
    /**
     * Retrieves the reconciliation provenance chain for a tenant.
     */
    getReconciliationProvenance(tenantPartition: string): readonly ReconciliationProvenanceRecord[];
    /**
     * Verifies the cryptographic integrity of the reconciliation provenance chain.
     */
    verifyReconciliationProvenance(tenantPartition: string): boolean;
}
