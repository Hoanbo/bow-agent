import type { CandidateAuthorizationRequest, HumanAuthorizationDecision, ActivationReadinessDecision, PolicyCandidateAuthorizationOptions } from './policyCandidateAuthorizationTypes.js';
import { PolicyCandidateAuthorizationRevalidationEngine } from './policyCandidateAuthorizationRevalidationEngine.js';
export declare class PolicyActivationReadinessEngine {
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    private readonly revalidationEngine;
    constructor(options?: PolicyCandidateAuthorizationOptions, revalidationEngine?: PolicyCandidateAuthorizationRevalidationEngine);
    private assertUserStopInactive;
    private validateTenant;
    /**
     * Evaluates whether an authorized candidate is ready for a future activation stage.
     */
    evaluateReadiness(request: CandidateAuthorizationRequest, humanDecision?: HumanAuthorizationDecision): ActivationReadinessDecision;
}
