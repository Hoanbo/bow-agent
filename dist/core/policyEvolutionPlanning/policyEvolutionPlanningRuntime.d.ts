import type { PolicyEvolutionIntakeRequest } from '../policyFeedbackReview/policyFeedbackReviewTypes.js';
import type { EvolutionPlan, CandidateDraft, CandidateValidationResult, HumanEvolutionReviewRequirement, PolicyEvolutionPlanningOptions } from './policyEvolutionPlanningTypes.js';
export interface EvolutionPlanningPipelineResult {
    readonly success: boolean;
    readonly plan: EvolutionPlan;
    readonly candidateDraft?: CandidateDraft;
    readonly validationResult?: CandidateValidationResult;
    readonly humanRequirement?: HumanEvolutionReviewRequirement;
    readonly status: 'PLAN_CREATED' | 'CANDIDATE_SYNTHESIZED_AND_VALIDATED' | 'VALIDATION_FAILED' | 'BLOCKED';
    readonly reasons: readonly string[];
}
export declare class PolicyEvolutionPlanningRuntime {
    private readonly planEngine;
    private readonly synthesisEngine;
    private readonly validationEngine;
    private readonly constraintEngine;
    private readonly humanBoundary;
    private readonly provenanceEngine;
    private readonly auditEngine;
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyEvolutionPlanningOptions);
    private assertUserStopInactive;
    private validateTenant;
    /**
     * Executes the end-to-end governed evolution planning pipeline:
     * 1. Intake ingestion & plan creation
     * 2. Candidate draft synthesis (for synthesis/reevaluation plans)
     * 3. Candidate validation & constraint verification
     * 4. Human review requirement generation
     * 5. Cryptographic provenance chaining
     * 6. Audit logging
     */
    planAndSynthesize(intake: PolicyEvolutionIntakeRequest, options?: {
        readonly sourcePolicyVersion?: string;
        readonly proposedRuleModifications?: Record<string, any>;
    }): EvolutionPlanningPipelineResult;
    /**
     * Verifies provenance integrity for an intake chain.
     */
    verifyProvenanceIntegrity(tenantPartition: string, intakeId: PolicyEvolutionIntakeRequest['intakeId']): {
        valid: boolean;
        errors: string[];
    };
}
