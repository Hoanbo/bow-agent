import type { PolicyDomain } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import type { StrategicAdvisoryMediationRegistry } from '../governedStrategicPolicyEvolution/StrategicAdvisoryMediationRegistry.js';
import { RemediationHandoffPackage, RemediationCandidate, RootCauseDiagnosisRecord, PolicyBlastRadiusRiskRecord, GovernedPolicyRemediationEvidenceDossier, EmergencyStopProvider } from './GovernedPolicyRemediationTypes.js';
export interface HandoffPackageContext {
    readonly candidate: RemediationCandidate;
    readonly diagnosis: RootCauseDiagnosisRecord;
    readonly blastRadius: PolicyBlastRadiusRiskRecord;
    readonly dossier: GovernedPolicyRemediationEvidenceDossier;
    readonly activePolicyVersion?: number;
}
export declare class ClosedLoopDeliberationHandoffBridge {
    private readonly emergencyStopProvider?;
    private readonly advisoryRegistry?;
    private readonly consumedNoncesByTenant;
    private readonly activeHandoffsByTenant;
    constructor(emergencyStopProvider?: EmergencyStopProvider, advisoryRegistry?: StrategicAdvisoryMediationRegistry);
    private assertEmergencyStopInactive;
    compileHandoffPackage(tenantId: string, policyDomain: PolicyDomain, context: HandoffPackageContext, currentTime?: Date): RemediationHandoffPackage;
    transmitHandoff(pkg: RemediationHandoffPackage, currentTime?: Date): {
        transmitted: boolean;
        registeredInDeliberationRegistry: boolean;
    };
}
