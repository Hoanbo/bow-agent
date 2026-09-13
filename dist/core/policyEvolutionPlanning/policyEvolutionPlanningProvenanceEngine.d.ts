import type { PolicyEvolutionIntakeId } from '../policyFeedbackReview/policyFeedbackReviewTypes.js';
import type { EvolutionPlanId, CandidateDraftId, EvolutionPlanningProvenanceRecord, PolicyEvolutionPlanningOptions } from './policyEvolutionPlanningTypes.js';
export declare class PolicyEvolutionPlanningProvenanceEngine {
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    private readonly chains;
    constructor(options?: PolicyEvolutionPlanningOptions);
    private assertUserStopInactive;
    private validateTenant;
    private getTenantChains;
    /**
     * Appends a transition event to the planning provenance chain.
     */
    appendEvent(tenantPartition: string, intakeId: PolicyEvolutionIntakeId, eventType: string, payload: {
        readonly planId?: EvolutionPlanId;
        readonly candidateDraftId?: CandidateDraftId;
        readonly details?: Record<string, any>;
    }): EvolutionPlanningProvenanceRecord;
    /**
     * Gets the head hash of a planning provenance chain.
     */
    getHeadHash(tenantPartition: string, intakeId: PolicyEvolutionIntakeId): string;
    /**
     * Cryptographically verifies the integrity of an evolution planning chain.
     */
    verifyChainIntegrity(tenantPartition: string, intakeId: PolicyEvolutionIntakeId): {
        valid: boolean;
        errors: string[];
    };
}
