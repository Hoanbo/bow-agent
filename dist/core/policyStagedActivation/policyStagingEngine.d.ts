import type { CandidateAuthorizationRequest, HumanAuthorizationDecision, ActivationReadinessDecision } from '../policyCandidateAuthorization/policyCandidateAuthorizationTypes.js';
import type { StagedPolicy, PolicyStagedActivationOptions } from './policyStagedActivationTypes.js';
import { PolicyActivationRevalidationEngine } from './policyActivationRevalidationEngine.js';
export declare class PolicyStagingEngine {
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    private readonly revalidationEngine;
    private readonly stagedCache;
    constructor(options?: PolicyStagedActivationOptions, revalidationEngine?: PolicyActivationRevalidationEngine);
    private assertUserStopInactive;
    private validateTenant;
    private getTenantStagedMap;
    /**
     * Stages an authorized policy candidate draft into a governed StagedPolicy artifact.
     * Enforces revalidation and idempotent retrieval.
     */
    stageCandidate(params: {
        readonly request: CandidateAuthorizationRequest;
        readonly decision: HumanAuthorizationDecision;
        readonly readiness: ActivationReadinessDecision;
        readonly proposedVersion?: string;
    }): StagedPolicy;
    /**
     * Retrieves a staged policy by candidate draft ID.
     */
    getStagedPolicy(tenantPartition: string, candidateDraftId: string): StagedPolicy | null;
}
