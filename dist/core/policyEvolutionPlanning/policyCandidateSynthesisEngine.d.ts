import type { EvolutionPlan, CandidateDraft, PolicyEvolutionPlanningOptions } from './policyEvolutionPlanningTypes.js';
export interface SynthesizeCandidateDraftInput {
    readonly plan: EvolutionPlan;
    readonly sourcePolicyVersion?: string;
    readonly proposedRuleModifications?: Record<string, any>;
    readonly provenanceHeadHash?: string;
}
export declare class PolicyCandidateSynthesisEngine {
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    private readonly drafts;
    constructor(options?: PolicyEvolutionPlanningOptions);
    private assertUserStopInactive;
    private validateTenant;
    private getTenantDrafts;
    /**
     * Synthesizes a deterministic CandidateDraft from an evolution plan.
     */
    synthesizeCandidateDraft(input: SynthesizeCandidateDraftInput): CandidateDraft;
    /**
     * Retrieves an existing candidate draft by evolutionPlanId.
     */
    getCandidateDraftByPlanId(tenantPartition: string, planId: string): CandidateDraft | undefined;
}
