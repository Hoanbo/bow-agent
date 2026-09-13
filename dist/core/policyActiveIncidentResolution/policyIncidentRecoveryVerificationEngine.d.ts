import type { ActivePolicyState } from '../policyStagedActivation/policyStagedActivationTypes.js';
import type { RuntimePolicySnapshot } from '../policyActiveRuntime/policyActiveRuntimeTypes.js';
import type { LifecycleReconciliationResult } from '../policyActiveLifecycleReconciliation/policyActiveLifecycleReconciliationTypes.js';
import type { SafetyBoundaryState } from '../policyActiveIncidentResponse/policyActiveIncidentResponseTypes.js';
import type { IncidentRecoveryHandoffRecord, IncidentRecoveryVerificationRecord, PolicyActiveIncidentResolutionOptions } from './policyActiveIncidentResolutionTypes.js';
export interface RecoveryVerificationInput {
    readonly tenantPartition: string;
    readonly handoffRecord: IncidentRecoveryHandoffRecord;
    readonly activePolicyState?: ActivePolicyState | null;
    readonly runtimeSnapshot?: RuntimePolicySnapshot | null;
    readonly reconciliationResult?: LifecycleReconciliationResult | null;
    readonly safetyBoundary?: SafetyBoundaryState | null;
}
export declare class PolicyIncidentRecoveryVerificationEngine {
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyActiveIncidentResolutionOptions);
    private assertUserStopInactive;
    /**
     * Evaluates post-recovery consistency across all layers.
     */
    verifyRecovery(input: RecoveryVerificationInput): IncidentRecoveryVerificationRecord;
}
