import type { CandidateAuthorizationRequest, HumanAuthorizationRole, PolicyCandidateAuthorizationOptions } from './policyCandidateAuthorizationTypes.js';
export declare class PolicyHumanAuthorizationGate {
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyCandidateAuthorizationOptions);
    private assertUserStopInactive;
    private validateTenant;
    /**
     * Asserts that a reviewer identity represents an authentic human and not an autonomous persona.
     */
    assertHumanIdentity(reviewerId: string): void;
    /**
     * Asserts that the reviewer holds an authorized governance role.
     */
    assertAuthorizedRole(role: string): asserts role is HumanAuthorizationRole;
    /**
     * Validates a human reviewer against a candidate authorization request.
     * Enforces role authority, persona legitimacy, and anti-self-approval.
     */
    validateReviewer(request: CandidateAuthorizationRequest, reviewerId: string, reviewerRole: string): void;
}
