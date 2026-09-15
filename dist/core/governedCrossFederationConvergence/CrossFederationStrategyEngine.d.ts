import { type CrossFederationStrategyProposal, type InterFederationDependency } from './GovernedCrossFederationTypes.js';
export interface EvaluatedStrategyScore {
    readonly proposalId: string;
    readonly federationId: string;
    readonly finalPriorityScore: number;
    readonly isHumanDirective: boolean;
    readonly hasActiveLease: boolean;
    readonly timestamp: number;
}
export declare class CrossFederationStrategyEngine {
    validateDependencyGraph(dependencies: readonly InterFederationDependency[]): void;
    rankProposals(proposals: readonly CrossFederationStrategyProposal[], humanDirectiveProposalIds?: readonly string[]): readonly EvaluatedStrategyScore[];
    topologicalSort(dependencies: readonly InterFederationDependency[]): readonly string[];
}
