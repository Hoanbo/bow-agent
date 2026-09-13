import type { ReadinessAssessmentReport } from '../policyGovernanceReadiness/policyGovernanceReadinessTypes.js';
import { type PhaseExitCandidate, type PhaseExitReviewPackage } from './policyPhaseTransitionTypes.js';
export interface CandidateGenerationParams {
    readonly report: ReadinessAssessmentReport;
    readonly proposedBy: string;
}
export declare class PolicyPhaseExitReviewEngine {
    private readonly readinessResolver;
    private readonly criteriaRevalidator;
    private readonly isUserStopActiveFn?;
    constructor(options?: {
        readonly isUserStopActive?: () => boolean;
    });
    private assertUserStopInactive;
    /**
     * Generates a PhaseExitCandidate and ReviewPackage from verified MS-1.3.76 evidence.
     * This is strictly non-mutating and does not change phase state.
     */
    generateExitCandidate(params: CandidateGenerationParams): {
        readonly candidate: PhaseExitCandidate;
        readonly reviewPackage: PhaseExitReviewPackage;
    };
}
