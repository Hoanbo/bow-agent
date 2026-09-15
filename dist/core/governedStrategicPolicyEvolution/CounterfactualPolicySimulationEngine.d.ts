import { PolicyEvolutionProposal, CounterfactualSimulationResult } from './GovernedStrategicPolicyEvolutionTypes.js';
export declare class CounterfactualPolicySimulationEngine {
    private activeSimulationCount;
    constructor();
    simulate(proposal: PolicyEvolutionProposal, requestedScenarios?: number, recursionDepth?: number): CounterfactualSimulationResult;
}
