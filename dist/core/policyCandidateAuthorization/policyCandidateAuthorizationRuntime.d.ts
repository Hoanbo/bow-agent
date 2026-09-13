import type { CandidateDraft, CandidateValidationResult, CandidateDraftId } from '../policyEvolutionPlanning/policyEvolutionPlanningTypes.js';
import type { CandidateAuthorizationRequest, HumanAuthorizationDecision, ActivationReadinessDecision, CandidateAuthorizationResult, CandidateAuthorizationRevalidationResult, CandidateAuthorizationDecisionType, HumanAuthorizationRole, CandidateAuthorizationAction, PolicyCandidateAuthorizationOptions } from './policyCandidateAuthorizationTypes.js';
import { PolicyCandidateAuthorizationRevalidationEngine } from './policyCandidateAuthorizationRevalidationEngine.js';
import { PolicyHumanAuthorizationGate } from './policyHumanAuthorizationGate.js';
import { PolicyCandidateAuthorizationEngine } from './policyCandidateAuthorizationEngine.js';
import { PolicyActivationReadinessEngine } from './policyActivationReadinessEngine.js';
import { PolicyAuthorizationDecisionStore } from './policyAuthorizationDecisionStore.js';
import { PolicyAuthorizationProvenanceEngine } from './policyAuthorizationProvenanceEngine.js';
import { PolicyCandidateAuthorizationAuditEngine } from './policyCandidateAuthorizationAuditEngine.js';
export declare class PolicyCandidateAuthorizationRuntime {
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    private readonly revalidationEngine;
    private readonly humanGate;
    private readonly authorizationEngine;
    private readonly readinessEngine;
    private readonly decisionStore;
    private readonly provenanceEngine;
    private readonly auditEngine;
    constructor(options?: PolicyCandidateAuthorizationOptions, dependencies?: {
        revalidationEngine?: PolicyCandidateAuthorizationRevalidationEngine;
        humanGate?: PolicyHumanAuthorizationGate;
        authorizationEngine?: PolicyCandidateAuthorizationEngine;
        readinessEngine?: PolicyActivationReadinessEngine;
        decisionStore?: PolicyAuthorizationDecisionStore;
        provenanceEngine?: PolicyAuthorizationProvenanceEngine;
        auditEngine?: PolicyCandidateAuthorizationAuditEngine;
    });
    private assertUserStopInactive;
    private validateTenant;
    /**
     * Constructs and registers a CandidateAuthorizationRequest for human governance.
     */
    requestAuthorization(params: {
        readonly candidateDraft: CandidateDraft;
        readonly candidateValidation: CandidateValidationResult;
        readonly requestedBy: string;
        readonly requestedAction?: CandidateAuthorizationAction;
        readonly rationale?: string;
        readonly requiredRole?: HumanAuthorizationRole;
        readonly ttlMs?: number;
    }): CandidateAuthorizationRequest;
    /**
     * Independently revalidates a candidate authorization request.
     */
    revalidateAuthorization(request: CandidateAuthorizationRequest): CandidateAuthorizationRevalidationResult;
    /**
     * Submits an explicit human authorization decision, evaluates activation readiness,
     * commits durable state, and registers cryptographic provenance.
     */
    submitHumanDecision(params: {
        readonly request: CandidateAuthorizationRequest;
        readonly reviewerId: string;
        readonly reviewerRole: HumanAuthorizationRole;
        readonly decision: CandidateAuthorizationDecisionType;
        readonly reason: string;
    }): CandidateAuthorizationResult;
    /**
     * Retrieves an authorization decision by candidate draft ID.
     */
    getAuthorizationDecision(tenantPartition: string, candidateDraftId: CandidateDraftId): HumanAuthorizationDecision | null;
    /**
     * Retrieves activation readiness by candidate draft ID.
     */
    getActivationReadiness(tenantPartition: string, candidateDraftId: CandidateDraftId): ActivationReadinessDecision | null;
    /**
     * Verifies the cryptographic provenance chain for a candidate authorization.
     */
    verifyAuthorizationProvenance(tenantPartition: string, candidateDraftId: CandidateDraftId): boolean;
}
