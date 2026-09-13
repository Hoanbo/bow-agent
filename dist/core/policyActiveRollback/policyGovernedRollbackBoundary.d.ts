import type { HumanAuthorizationRole } from '../policyCandidateAuthorization/policyCandidateAuthorizationTypes.js';
import type { GovernedRollbackAuthorization, PolicyActiveRollbackOptions } from './policyActiveRollbackTypes.js';
export declare class PolicyGovernedRollbackBoundary {
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyActiveRollbackOptions);
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
     * Evaluates and issues governed human authorization clearance.
     */
    authorizeOperation(params: {
        readonly operationType: 'ROLLBACK' | 'SUNSET' | 'RECOVERY';
        readonly targetRequestId: string;
        readonly tenantPartition: string;
        readonly evaluationId: string;
        readonly evaluationStatus: string;
        readonly operatorId: string;
        readonly operatorRole: HumanAuthorizationRole;
        readonly governanceRationale: string;
        readonly requestedBy: string;
        readonly previousHash?: string;
    }): GovernedRollbackAuthorization;
}
