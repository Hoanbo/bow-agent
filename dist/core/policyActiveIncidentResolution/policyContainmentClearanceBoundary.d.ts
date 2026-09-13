import type { HumanAuthorizationRole } from '../policyCandidateAuthorization/policyCandidateAuthorizationTypes.js';
import type { ContainmentAssessmentRecord, ContainmentClearanceRecord, PolicyActiveIncidentResolutionOptions } from './policyActiveIncidentResolutionTypes.js';
export interface ContainmentClearanceParams {
    readonly tenantPartition: string;
    readonly assessment: ContainmentAssessmentRecord;
    readonly operatorId: string;
    readonly operatorRole: HumanAuthorizationRole;
    readonly governanceRationale: string;
    readonly originalReporterId?: string | null;
    readonly previousProvenanceHash: string;
}
export declare class PolicyContainmentClearanceBoundary {
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyActiveIncidentResolutionOptions);
    private assertUserStopInactive;
    /**
     * Evaluates and issues a governed human containment clearance.
     */
    clearContainment(params: ContainmentClearanceParams): ContainmentClearanceRecord;
}
