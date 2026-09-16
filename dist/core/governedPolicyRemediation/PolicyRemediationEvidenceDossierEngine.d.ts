import type { PolicyDomain } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import { GovernedPolicyRemediationEvidenceDossier, CorrelatedIncidentEnvelope, RootCauseDiagnosisRecord, PolicyBlastRadiusRiskRecord, RemediationCandidate, EmergencyStopProvider } from './GovernedPolicyRemediationTypes.js';
export interface DossierCompilationInput {
    readonly correlationEnvelope: CorrelatedIncidentEnvelope;
    readonly diagnosisRecord: RootCauseDiagnosisRecord;
    readonly blastRadiusRecord: PolicyBlastRadiusRiskRecord;
    readonly remediationCandidate: RemediationCandidate;
}
export declare class PolicyRemediationEvidenceDossierEngine {
    private readonly emergencyStopProvider?;
    constructor(emergencyStopProvider?: EmergencyStopProvider);
    private assertEmergencyStopInactive;
    compileRemediationDossier(tenantId: string, policyDomain: PolicyDomain, input: DossierCompilationInput): GovernedPolicyRemediationEvidenceDossier;
}
