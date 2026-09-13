import type { ActivePolicyIncidentRecord, SafetyBoundaryState } from '../policyActiveIncidentResponse/policyActiveIncidentResponseTypes.js';
import type { ContainmentAssessmentRecord, PolicyActiveIncidentResolutionOptions } from './policyActiveIncidentResolutionTypes.js';
export interface ContainmentAssessmentInput {
    readonly tenantPartition: string;
    readonly incident: ActivePolicyIncidentRecord;
    readonly safetyBoundary?: SafetyBoundaryState | null;
    readonly isRuntimeDriftBlocked?: boolean;
}
export declare class PolicyContainmentAssessmentEngine {
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyActiveIncidentResolutionOptions);
    private assertUserStopInactive;
    /**
     * Deterministically assesses whether an incident is contained.
     * Pure read-only: does not clear containment or mutate any state.
     */
    assessContainment(input: ContainmentAssessmentInput): ContainmentAssessmentRecord;
}
