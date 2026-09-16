import type { PolicyDomain } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import { PolicyBlastRadiusRiskRecord, AnonymizedDependencyTopology, RootCauseDiagnosisRecord, EmergencyStopProvider } from './GovernedPolicyRemediationTypes.js';
export interface WorkflowImpactInput {
    readonly activeWorkflowCount: number;
    readonly crossDomainRipple: boolean;
    readonly anonymizedTopology?: AnonymizedDependencyTopology;
}
export declare class PolicyBlastRadiusRiskAnalyzer {
    private readonly emergencyStopProvider?;
    constructor(emergencyStopProvider?: EmergencyStopProvider);
    private assertEmergencyStopInactive;
    evaluateBlastRadius(tenantId: string, policyDomain: PolicyDomain, diagnosis: RootCauseDiagnosisRecord, impactInput?: WorkflowImpactInput): PolicyBlastRadiusRiskRecord;
}
