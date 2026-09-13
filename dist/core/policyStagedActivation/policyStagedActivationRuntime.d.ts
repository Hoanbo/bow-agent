import type { CandidateAuthorizationRequest, HumanAuthorizationDecision, ActivationReadinessDecision, HumanAuthorizationRole } from '../policyCandidateAuthorization/policyCandidateAuthorizationTypes.js';
import type { CandidateDraftId } from '../policyEvolutionPlanning/policyEvolutionPlanningTypes.js';
import type { StagedPolicy, ActivationPreflightResult, GovernedActivationAuthorization, ActivePolicyState, PolicyStagedActivationOptions } from './policyStagedActivationTypes.js';
import { PolicyActivationRevalidationEngine } from './policyActivationRevalidationEngine.js';
import { PolicyStagingEngine } from './policyStagingEngine.js';
import { PolicyActivationPreflightEngine } from './policyActivationPreflightEngine.js';
import { PolicyGovernedActivationBoundary } from './policyGovernedActivationBoundary.js';
import { PolicyActivationStateStore } from './policyActivationStateStore.js';
import { PolicyStagedActivationProvenanceEngine } from './policyStagedActivationProvenanceEngine.js';
import { PolicyStagedActivationAuditEngine } from './policyStagedActivationAuditEngine.js';
export declare class PolicyStagedActivationRuntime {
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    private readonly revalidationEngine;
    private readonly stagingEngine;
    private readonly preflightEngine;
    private readonly governedBoundary;
    private readonly transitionEngine;
    private readonly stateStore;
    private readonly provenanceEngine;
    private readonly auditEngine;
    constructor(options?: PolicyStagedActivationOptions, dependencies?: {
        revalidationEngine?: PolicyActivationRevalidationEngine;
        stagingEngine?: PolicyStagingEngine;
        preflightEngine?: PolicyActivationPreflightEngine;
        governedBoundary?: PolicyGovernedActivationBoundary;
        stateStore?: PolicyActivationStateStore;
        provenanceEngine?: PolicyStagedActivationProvenanceEngine;
        auditEngine?: PolicyStagedActivationAuditEngine;
    });
    private assertUserStopInactive;
    private validateTenant;
    /**
     * Stages an authorized policy candidate.
     */
    stagePolicy(params: {
        readonly request: CandidateAuthorizationRequest;
        readonly decision: HumanAuthorizationDecision;
        readonly readiness: ActivationReadinessDecision;
        readonly proposedVersion?: string;
    }): StagedPolicy;
    /**
     * Runs preflight verification on a staged policy.
     */
    runPreflight(stagedPolicy: StagedPolicy): ActivationPreflightResult;
    /**
     * Evaluates and grants governed human activation clearance.
     */
    authorizeActivation(params: {
        readonly stagedPolicy: StagedPolicy;
        readonly preflight: ActivationPreflightResult;
        readonly operatorId: string;
        readonly operatorRole: HumanAuthorizationRole;
        readonly governanceRationale: string;
        readonly candidateProposer?: string;
    }): GovernedActivationAuthorization;
    /**
     * Commits the governed active state transition from STAGED policy to ACTIVE_POLICY.
     */
    commitActivation(params: {
        readonly stagedPolicy: StagedPolicy;
        readonly governedAuthorization: GovernedActivationAuthorization;
    }): ActivePolicyState;
    /**
     * Retrieves a staged policy by candidate draft ID.
     */
    getStagedPolicy(tenantPartition: string, candidateDraftId: CandidateDraftId): StagedPolicy | null;
    /**
     * Retrieves the current active policy state for a tenant.
     */
    getActivePolicy(tenantPartition: string): ActivePolicyState | null;
    /**
     * Cryptographically verifies the provenance chain for a candidate activation.
     */
    verifyProvenance(tenantPartition: string, candidateDraftId: CandidateDraftId): boolean;
}
