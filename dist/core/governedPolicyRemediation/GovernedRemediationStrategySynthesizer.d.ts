import type { PolicyDomain } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import { RemediationCandidate, RootCauseDiagnosisRecord, PolicyBlastRadiusRiskRecord, EmergencyStopProvider } from './GovernedPolicyRemediationTypes.js';
export interface SynthesisContext {
    readonly diagnosis: RootCauseDiagnosisRecord;
    readonly blastRadius: PolicyBlastRadiusRiskRecord;
    readonly incidentEvidenceHash: string;
    readonly activePolicyHash: string;
    readonly activePolicyVersion?: number;
}
export declare class GovernedRemediationStrategySynthesizer {
    private readonly emergencyStopProvider?;
    constructor(emergencyStopProvider?: EmergencyStopProvider);
    private assertEmergencyStopInactive;
    synthesizeRemediationCandidate(tenantId: string, policyDomain: PolicyDomain, context: SynthesisContext): RemediationCandidate;
}
