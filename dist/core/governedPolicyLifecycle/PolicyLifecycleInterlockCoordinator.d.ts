import type { PolicyDomain } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import { type PolicyLifecycleState } from './GovernedPolicyLifecycleTypes.js';
export declare class PolicyLifecycleInterlockCoordinator {
    private readonly isEmergencyStopActiveFn?;
    private readonly isUserStopActiveFn?;
    constructor(options?: {
        isEmergencyStopActive?: (domain?: string) => boolean;
        isUserStopActive?: (tenantId?: string) => boolean;
    });
    /**
     * Assert whether a lifecycle transition is permitted under current interlock state.
     */
    assertLifecyclePermitted(tenantId: string, policyDomain: PolicyDomain, targetState: PolicyLifecycleState): void;
    isEmergencyStopEngaged(domain?: string): boolean;
    isUserStopEngaged(tenantId?: string): boolean;
}
