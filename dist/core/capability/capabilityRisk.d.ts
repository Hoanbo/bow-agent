import type { CapabilityDescriptor, PermissionLevel } from './capabilityTypes.js';
import type { ActionRiskLevel } from '../world-action/worldActionTypes.js';
export declare class CapabilityRiskEngine {
    assessCapabilityRisk(descriptor: CapabilityDescriptor, target?: string, parameters?: Record<string, any>): {
        riskLevel: ActionRiskLevel;
        permissionLevel: PermissionLevel;
    };
}
export declare const globalCapabilityRisk: CapabilityRiskEngine;
