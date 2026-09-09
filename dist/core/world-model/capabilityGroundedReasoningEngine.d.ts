import type { CapabilityPlanFeasibility } from './worldModelTypes.js';
import type { HostEnvironment } from '../host/hostEnvironmentTypes.js';
export interface PlanRequirementSpec {
    readonly planId: string;
    readonly target?: string;
    readonly requiredCapabilities: string[];
    readonly requiredParameters?: Record<string, unknown>;
    readonly riskLevel?: string;
}
export declare class CapabilityGroundedReasoningEngine {
    /**
     * Distinguishes the 7 stages of a capability lifecycle.
     */
    evaluateCapabilityStage(capabilityId: string, host: HostEnvironment, isDiscovered: boolean, isAvailableOnHost: boolean, isGovernedPermitted: boolean, hasAuthorizationToken: boolean, hasExecuted: boolean, isVerified: boolean): {
        stage: 'HOST' | 'DISCOVERED' | 'AVAILABLE' | 'GOVERNED' | 'AUTHORIZED' | 'EXECUTED' | 'VERIFIED';
        canExecuteNow: boolean;
        reason: string;
    };
    /**
     * Evaluates the feasibility of a proposed plan against discovered host capabilities.
     */
    evaluatePlanFeasibility(spec: PlanRequirementSpec, host: HostEnvironment, activeTokens?: string[]): CapabilityPlanFeasibility;
}
export declare const globalCapabilityGroundedReasoningEngine: CapabilityGroundedReasoningEngine;
