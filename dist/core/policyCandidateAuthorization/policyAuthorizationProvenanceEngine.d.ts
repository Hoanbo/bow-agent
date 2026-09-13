import type { EvolutionPlanId, CandidateDraftId } from '../policyEvolutionPlanning/policyEvolutionPlanningTypes.js';
import type { AuthorizationRequestId, AuthorizationDecisionId, ActivationReadinessId, AuthorizationProvenanceRecord, PolicyCandidateAuthorizationOptions } from './policyCandidateAuthorizationTypes.js';
export declare class PolicyAuthorizationProvenanceEngine {
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    private readonly chains;
    constructor(options?: PolicyCandidateAuthorizationOptions);
    private assertUserStopInactive;
    private validateTenant;
    private getTenantChains;
    /**
     * Appends an authorization lifecycle event to the cryptographic provenance chain.
     */
    appendEvent(tenantPartition: string, candidateDraftId: CandidateDraftId, evolutionPlanId: EvolutionPlanId, eventType: string, payload: {
        readonly authorizationRequestId?: AuthorizationRequestId;
        readonly authorizationDecisionId?: AuthorizationDecisionId;
        readonly activationReadinessId?: ActivationReadinessId;
        readonly details?: Record<string, any>;
    }): AuthorizationProvenanceRecord;
    /**
     * Cryptographically verifies the provenance chain for a candidate draft.
     */
    verifyChain(tenantPartition: string, candidateDraftId: CandidateDraftId): boolean;
    /**
     * Retrieves the current provenance head hash for a candidate draft.
     */
    getProvenanceHead(tenantPartition: string, candidateDraftId: CandidateDraftId): string;
    /**
     * Retrieves immutable provenance history records for a candidate draft.
     */
    getProvenanceRecords(tenantPartition: string, candidateDraftId: CandidateDraftId): readonly AuthorizationProvenanceRecord[];
}
