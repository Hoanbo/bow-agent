import type { HumanAuthorizationRole } from '../policyCandidateAuthorization/policyCandidateAuthorizationTypes.js';
import type { StagedPolicy, ActivationPreflightResult, GovernedActivationAuthorization, PolicyStagedActivationOptions } from './policyStagedActivationTypes.js';
export declare class PolicyGovernedActivationBoundary {
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyStagedActivationOptions);
    private assertUserStopInactive;
    private validateTenant;
    /**
     * Asserts that an operator identity represents a verified human and not an autonomous actor.
     */
    assertHumanOperator(operatorId: string): void;
    /**
     * Asserts that the operator holds an authorized governance role.
     */
    assertAuthorizedRole(role: string): asserts role is HumanAuthorizationRole;
    /**
     * Evaluates and grants governed activation clearance for a staged policy.
     */
    authorizeActivation(params: {
        readonly stagedPolicy: StagedPolicy;
        readonly preflight: ActivationPreflightResult;
        readonly operatorId: string;
        readonly operatorRole: HumanAuthorizationRole;
        readonly governanceRationale: string;
        readonly candidateProposer?: string;
    }): GovernedActivationAuthorization;
}
