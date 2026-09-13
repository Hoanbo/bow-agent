import type { HumanAuthorizationRole } from '../policyCandidateAuthorization/policyCandidateAuthorizationTypes.js';
import type { IncidentResolutionRecord, IncidentClosureRecord, PolicyActiveIncidentResolutionOptions } from './policyActiveIncidentResolutionTypes.js';
export interface IncidentClosureParams {
    readonly tenantPartition: string;
    readonly resolution: IncidentResolutionRecord;
    readonly operatorId: string;
    readonly operatorRole: HumanAuthorizationRole;
    readonly closureRationale: string;
    readonly previousProvenanceHash: string;
    readonly originalReporterId?: string | null;
}
export declare class PolicyIncidentClosureBoundary {
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyActiveIncidentResolutionOptions);
    private assertUserStopInactive;
    /**
     * Evaluates closure conditions and produces an immutable IncidentClosureRecord.
     */
    closeIncident(params: IncidentClosureParams): IncidentClosureRecord;
}
