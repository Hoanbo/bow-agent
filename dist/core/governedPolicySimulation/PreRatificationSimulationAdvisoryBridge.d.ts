import type { PolicyDomain } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import { EmergencyStopProvider, SimulationHandoffId, PolicySimulationEvidenceDossier, SimulationAdvisoryPackage } from './GovernedPolicySimulationTypes.js';
export interface HandoffDeliveryRecord {
    readonly handoffId: SimulationHandoffId;
    readonly dossierId: string;
    readonly tenantId: string;
    readonly policyDomain: PolicyDomain;
    readonly handoffNonce: string;
    readonly deliveredAt: number;
}
export declare class PreRatificationSimulationAdvisoryBridge {
    private readonly emergencyStopProvider?;
    private readonly consumedNonces;
    private readonly deliveryLog;
    constructor(emergencyStopProvider?: EmergencyStopProvider);
    private assertEmergencyStopInactive;
    private sanitizeTenantId;
    /**
     * Packages a simulation evidence dossier into a non-authoritative advisory package for MS-1.5.19.
     * SIMULATION != RATIFICATION: Delivers advisory evidence only; zero authority to ratify or activate.
     */
    packageSimulationAdvisory(dossier: PolicySimulationEvidenceDossier, overrideNonce?: string): SimulationAdvisoryPackage;
    getDeliveryLog(): readonly HandoffDeliveryRecord[];
}
