import type { CandidateDraftId } from '../policyEvolutionPlanning/policyEvolutionPlanningTypes.js';
import type { AuthorizationDecisionId, ActivationReadinessId } from '../policyCandidateAuthorization/policyCandidateAuthorizationTypes.js';
import type { StagedActivationId, ActivationPreflightId, ActivationCommitId, StagedActivationProvenanceRecord, PolicyStagedActivationOptions } from './policyStagedActivationTypes.js';
export declare class PolicyStagedActivationProvenanceEngine {
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    private readonly chains;
    constructor(options?: PolicyStagedActivationOptions);
    private assertUserStopInactive;
    private validateTenant;
    private getTenantChains;
    /**
     * Appends an activation event to the cryptographic provenance chain.
     */
    appendEvent(tenantPartition: string, candidateDraftId: CandidateDraftId, eventType: string, payload: {
        readonly stagedActivationId?: StagedActivationId;
        readonly authorizationDecisionId?: AuthorizationDecisionId;
        readonly activationReadinessId?: ActivationReadinessId;
        readonly activationPreflightId?: ActivationPreflightId;
        readonly activationCommitId?: ActivationCommitId;
        readonly details?: Record<string, any>;
    }): StagedActivationProvenanceRecord;
    /**
     * Cryptographically verifies the provenance chain for a candidate activation.
     */
    verifyChain(tenantPartition: string, candidateDraftId: CandidateDraftId): boolean;
    /**
     * Retrieves the current provenance head hash for a candidate activation.
     */
    getProvenanceHead(tenantPartition: string, candidateDraftId: CandidateDraftId): string;
}
