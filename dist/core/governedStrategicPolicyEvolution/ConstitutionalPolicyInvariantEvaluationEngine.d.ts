import { PolicyEvolutionProposal, InvariantCheckResult } from './GovernedStrategicPolicyEvolutionTypes.js';
export declare class ConstitutionalPolicyInvariantEvaluationEngine {
    private constitutionalAxioms;
    constructor();
    evaluateConstitutionalCompliance(proposal: PolicyEvolutionProposal): InvariantCheckResult;
}
