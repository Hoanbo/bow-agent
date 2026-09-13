import type { ActivePolicyIncidentRecord } from '../policyActiveIncidentResponse/policyActiveIncidentResponseTypes.js';
import type { ContainmentClearanceRecord, IncidentRecoveryVerificationRecord, IncidentResolutionRecord, PolicyActiveIncidentResolutionOptions } from './policyActiveIncidentResolutionTypes.js';
export interface IncidentResolutionInput {
    readonly tenantPartition: string;
    readonly incident: ActivePolicyIncidentRecord;
    readonly containmentClearance: ContainmentClearanceRecord;
    readonly recoveryVerification?: IncidentRecoveryVerificationRecord | null;
    readonly nonRecoveryResolutionRationale?: string | null;
}
export declare class PolicyIncidentResolutionEngine {
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyActiveIncidentResolutionOptions);
    private assertUserStopInactive;
    /**
     * Deterministically evaluates whether an incident is ready to be declared resolved.
     */
    evaluateResolution(input: IncidentResolutionInput): IncidentResolutionRecord;
}
