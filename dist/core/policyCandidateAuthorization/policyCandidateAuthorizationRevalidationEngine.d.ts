import type { CandidateAuthorizationRequest, CandidateAuthorizationRevalidationResult, PolicyCandidateAuthorizationOptions } from './policyCandidateAuthorizationTypes.js';
export declare const CANDIDATE_AUTHORIZATION_HARD_FORBIDDEN: readonly ["transfer_funds", "delete_database", "bypass_robot_interlocks", "execute_untrusted_host_script"];
export declare class PolicyCandidateAuthorizationRevalidationEngine {
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyCandidateAuthorizationOptions);
    private assertUserStopInactive;
    private validateTenant;
    /**
     * Independently revalidates a candidate authorization request.
     */
    revalidateCandidateForAuthorization(request: CandidateAuthorizationRequest): CandidateAuthorizationRevalidationResult;
}
