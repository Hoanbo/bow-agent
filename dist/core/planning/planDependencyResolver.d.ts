import { type GovernedCandidateStep, type GovernedPlannerConfig, type PlanDag, type PlanDependencyEdge } from './governedPlanningTypes.js';
export interface DependencyResolverResult {
    readonly steps: readonly GovernedCandidateStep[];
    readonly dag: PlanDag;
}
export declare class PlanDependencyResolver {
    /**
     * Resolves dependencies, builds a validated PlanDag, and verifies acyclicity.
     * Fails closed on any cycle, missing dependency, duplicate edge, or self-dependency.
     */
    static resolve(steps: readonly GovernedCandidateStep[], rawEdges?: readonly PlanDependencyEdge[], config?: GovernedPlannerConfig): DependencyResolverResult;
}
