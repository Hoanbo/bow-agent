// src/core/capability/capabilityRisk.ts
// BOWCON V4.0 — MS-1.3.34: REAL BOWCON CAPABILITY & ENVIRONMENT INTERACTION RUNTIME
//
// Capability risk evaluation and PDP policy synchronization.
import { mapRiskToPermission } from './capabilityPermission.js';
export class CapabilityRiskEngine {
    assessCapabilityRisk(descriptor, target, parameters) {
        let risk = descriptor.riskLevel;
        // Elevate risk if destructive flags are present
        if (parameters?.recursive === true || parameters?.force === true || parameters?.permanent === true) {
            if (risk === 'ELEVATED')
                risk = 'HIGH';
            else if (risk === 'REVERSIBLE')
                risk = 'ELEVATED';
        }
        const permissionLevel = mapRiskToPermission(risk);
        return { riskLevel: risk, permissionLevel };
    }
}
export const globalCapabilityRisk = new CapabilityRiskEngine();
