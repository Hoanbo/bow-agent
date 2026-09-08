import type { CapabilityDescriptor, CapabilityExecutionRequest } from './capabilityTypes.js';
export interface PreparedCapabilityPlan {
    readonly planId: string;
    readonly descriptor: CapabilityDescriptor;
    readonly target?: string;
    readonly normalizedParameters: Record<string, any>;
    readonly riskLevel: string;
    readonly permissionLevel: string;
    readonly requiresAuthorization: boolean;
    readonly requiresConfirmation: boolean;
    readonly isDryRun: boolean;
    readonly plannedAt: number;
}
export declare class CapabilityPlanner {
    plan(descriptor: CapabilityDescriptor, request: CapabilityExecutionRequest): PreparedCapabilityPlan;
}
export declare const globalCapabilityPlanner: CapabilityPlanner;
