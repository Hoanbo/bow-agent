import type { CandidateAuthorizationRequest, CandidateAuthorizationDecisionType, HumanAuthorizationDecision, HumanAuthorizationRole, PolicyCandidateAuthorizationOptions } from './policyCandidateAuthorizationTypes.js';
import { PolicyCandidateAuthorizationRevalidationEngine } from './policyCandidateAuthorizationRevalidationEngine.js';
import { PolicyHumanAuthorizationGate } from './policyHumanAuthorizationGate.js';
export declare class PolicyCandidateAuthorizationEngine {
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    private readonly revalidationEngine;
    private readonly humanGate;
    constructor(options?: PolicyCandidateAuthorizationOptions, revalidationEngine?: PolicyCandidateAuthorizationRevalidationEngine, humanGate?: PolicyHumanAuthorizationGate);
    private assertUserStopInactive;
    private validateTenant;
    /**
     * Evaluates and records a human authorization decision on a candidate draft.
     */
    authorizeCandidate(request: CandidateAuthorizationRequest, reviewerId: string, reviewerRole: HumanAuthorizationRole, decision: CandidateAuthorizationDecisionType, reason: string): HumanAuthorizationDecision;
}
