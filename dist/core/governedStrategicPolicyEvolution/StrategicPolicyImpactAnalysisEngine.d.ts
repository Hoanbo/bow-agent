import { PolicyEvolutionProposal, PolicyImpactAnalysisResult } from './GovernedStrategicPolicyEvolutionTypes.js';
export declare class StrategicPolicyImpactAnalysisEngine {
    private canonicalDimensions;
    constructor();
    analyzeImpact(proposal: PolicyEvolutionProposal, activeFederationCount?: number, activeMissionCount?: number): PolicyImpactAnalysisResult;
}
