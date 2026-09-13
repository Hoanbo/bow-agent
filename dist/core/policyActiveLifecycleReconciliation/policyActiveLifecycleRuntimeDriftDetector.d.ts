import type { ActivePolicyState } from '../policyStagedActivation/policyStagedActivationTypes.js';
import type { RuntimePolicySnapshot, PolicyActiveRuntimeOptions } from '../policyActiveRuntime/policyActiveRuntimeTypes.js';
import { PolicyActiveRuntimeFreshnessValidator } from '../policyActiveRuntime/policyActiveRuntimeFreshnessValidator.js';
import { PolicyActiveRuntimeSyncEngine } from '../policyActiveRuntime/policyActiveRuntimeSyncEngine.js';
import { PolicyActiveRuntimePDPBridge } from '../policyActiveRuntime/policyActiveRuntimePDPBridge.js';
import { PolicyActiveRuntimePEPBridge } from '../policyActiveRuntime/policyActiveRuntimePEPBridge.js';
import type { LifecycleDriftRecord, LifecycleBoundaryCheckResult } from './policyActiveLifecycleReconciliationTypes.js';
export interface RuntimeDriftDetectionResult {
    readonly consistent: boolean;
    readonly runtimeSnapshot: RuntimePolicySnapshot | null;
    readonly detectedDrifts: readonly LifecycleDriftRecord[];
    readonly boundaryChecks: readonly LifecycleBoundaryCheckResult[];
    readonly blockingReasons: readonly string[];
}
export declare class PolicyActiveLifecycleRuntimeDriftDetector {
    private readonly freshnessValidator;
    private readonly syncEngine?;
    private readonly pdpBridge?;
    private readonly pepBridge?;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyActiveRuntimeOptions, syncEngine?: PolicyActiveRuntimeSyncEngine, freshnessValidator?: PolicyActiveRuntimeFreshnessValidator, pdpBridge?: PolicyActiveRuntimePDPBridge, pepBridge?: PolicyActiveRuntimePEPBridge);
    private assertUserStopInactive;
    /**
     * Compares durable ActivePolicyState with runtime snapshot and bridges.
     */
    detectDrift(tenantPartition: string, activeState: ActivePolicyState | null, providedSnapshot?: RuntimePolicySnapshot | null): RuntimeDriftDetectionResult;
}
