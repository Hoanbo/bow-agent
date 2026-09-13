import type { CognitiveResult } from '../cognitive/cognitiveTypes.js';
import { type GovernedCandidateStep, type GovernedPlannerConfig } from './governedPlanningTypes.js';
export declare class PlanStepBuilder {
    /**
     * Constructs an ordered array of inert candidate steps from untrusted cognitive results.
     */
    static buildSteps(cognitiveResult: CognitiveResult, config?: GovernedPlannerConfig): readonly GovernedCandidateStep[];
}
