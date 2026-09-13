import type { CandidateAuthorizationRequest, HumanAuthorizationDecision, ActivationReadinessDecision } from '../policyCandidateAuthorization/policyCandidateAuthorizationTypes.js';
import type { PolicyStagedActivationOptions } from './policyStagedActivationTypes.js';
export declare const STAGED_ACTIVATION_HARD_FORBIDDEN: readonly ["transfer_funds", "delete_database", "bypass_robot_interlocks", "execute_untrusted_host_script"];
export interface ActivationRevalidationResult {
    readonly valid: boolean;
    readonly status: 'VALID' | 'BLOCKED' | 'INVALID' | 'EXPIRED' | 'SUPERSEDED' | 'CONTRADICTORY';
    readonly tenantPartition: string;
    readonly candidateDraftId: string;
    readonly issues: readonly string[];
    readonly revalidatedAt: string;
}
export declare class PolicyActivationRevalidationEngine {
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyStagedActivationOptions);
    private assertUserStopInactive;
    private validateTenant;
    /**
     * Independently revalidates all prerequisites prior to policy staging or activation.
     */
    revalidateForActivation(params: {
        readonly request: CandidateAuthorizationRequest;
        readonly decision: HumanAuthorizationDecision;
        readonly readiness: ActivationReadinessDecision;
    }): ActivationRevalidationResult;
}
