import type { ActivePolicyIncidentRecord } from '../policyActiveIncidentResponse/policyActiveIncidentResponseTypes.js';
import type { SafetyBoundaryState } from '../policyActiveIncidentResponse/policyActiveIncidentResponseTypes.js';
import type { ActivePolicyState } from '../policyStagedActivation/policyStagedActivationTypes.js';
import type { PolicyActiveIncidentResolutionOptions } from './policyActiveIncidentResolutionTypes.js';
export interface IncidentRevalidationParams {
    readonly tenantPartition: string;
    readonly incident: ActivePolicyIncidentRecord;
    readonly currentActivePolicy?: ActivePolicyState | null;
    readonly currentSafetyBoundary?: SafetyBoundaryState | null;
    readonly expectedState?: string;
}
export interface IncidentRevalidationResult {
    readonly valid: boolean;
    readonly checksPassed: readonly string[];
    readonly blockingReasons: readonly string[];
    readonly revalidatedAt: string;
}
export declare class PolicyIncidentResolutionRevalidationEngine {
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyActiveIncidentResolutionOptions);
    private assertUserStopInactive;
    /**
     * Revalidates an incident record prior to lifecycle transitions.
     */
    revalidate(params: IncidentRevalidationParams): IncidentRevalidationResult;
}
