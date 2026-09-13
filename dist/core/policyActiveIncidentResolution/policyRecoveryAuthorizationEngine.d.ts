import type { HumanAuthorizationRole } from '../policyCandidateAuthorization/policyCandidateAuthorizationTypes.js';
import type { HistoricalPolicyVersion } from '../policyActiveRollback/policyActiveRollbackTypes.js';
import type { LifecycleReconciliationResult } from '../policyActiveLifecycleReconciliation/policyActiveLifecycleReconciliationTypes.js';
import type { ContainmentClearanceRecord, RecoveryAuthorizationRecord, PolicyActiveIncidentResolutionOptions } from './policyActiveIncidentResolutionTypes.js';
export interface RecoveryAuthorizationParams {
    readonly tenantPartition: string;
    readonly clearance: ContainmentClearanceRecord;
    readonly recoveryTarget: HistoricalPolicyVersion;
    readonly operatorId: string;
    readonly operatorRole: HumanAuthorizationRole;
    readonly governanceRationale: string;
    readonly reconciliationResult?: LifecycleReconciliationResult | null;
    readonly previousProvenanceHash: string;
    readonly originalRequesterId?: string | null;
}
export declare class PolicyRecoveryAuthorizationEngine {
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyActiveIncidentResolutionOptions);
    private assertUserStopInactive;
    /**
     * Evaluates preconditions and produces an immutable RecoveryAuthorizationRecord.
     * Zero execution: delegates execution to MS-1.3.72 rollback runtime.
     */
    authorizeRecovery(params: RecoveryAuthorizationParams): RecoveryAuthorizationRecord;
}
