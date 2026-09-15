import { PolicyEvolutionProposal, PolicyImpactAnalysisResult, CounterfactualSimulationResult, InvariantCheckResult, StrategicPolicyDeliberationDossier, HumanDecisionToken, HumanDecisionRecord } from './GovernedStrategicPolicyEvolutionTypes.js';
export declare class HumanDeliberationGateway {
    private dossiersByTenant;
    constructor();
    compileDossier(proposal: PolicyEvolutionProposal, impact: PolicyImpactAnalysisResult, simulation: CounterfactualSimulationResult, compliance: InvariantCheckResult): StrategicPolicyDeliberationDossier;
    recordHumanDecision(dossier: StrategicPolicyDeliberationDossier, token: HumanDecisionToken): {
        decisionRecord: HumanDecisionRecord;
        updatedDossier: StrategicPolicyDeliberationDossier;
    };
    getDossier(tenantId: string, dossierId: string): StrategicPolicyDeliberationDossier | undefined;
    clearTenant(tenantId: string): void;
    private getOrCreateTenantDossiers;
}
