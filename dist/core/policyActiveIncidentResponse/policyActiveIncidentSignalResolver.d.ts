import type { ActivePolicyState } from '../policyStagedActivation/policyStagedActivationTypes.js';
import type { RuntimePolicySnapshot } from '../policyActiveRuntime/policyActiveRuntimeTypes.js';
import type { LifecycleReconciliationResult } from '../policyActiveLifecycleReconciliation/policyActiveLifecycleReconciliationTypes.js';
import type { DegradationSignal, PolicyActiveIncidentResponseOptions } from './policyActiveIncidentResponseTypes.js';
export interface ResolvedPolicyIncidentSignals {
    readonly tenantPartition: string;
    readonly activePolicyStateId: string | null;
    readonly runtimeSnapshotId: string | null;
    readonly activePolicyVersion: string | null;
    readonly runtimePolicyVersion: string | null;
    readonly signals: readonly DegradationSignal[];
}
export declare class PolicyActiveIncidentSignalResolver {
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyActiveIncidentResponseOptions);
    private assertUserStopInactive;
    /**
     * Evaluates and normalizes signals from upstream active policy components.
     */
    resolveSignals(tenantPartition: string, params: {
        activePolicyState?: ActivePolicyState | null;
        runtimeSnapshot?: RuntimePolicySnapshot | null;
        reconciliationResult?: LifecycleReconciliationResult | null;
        pdpDecisionAllowed?: boolean;
        pepDisposition?: string;
        testedAction?: string;
        recentDenialCount?: number;
    }): ResolvedPolicyIncidentSignals;
}
