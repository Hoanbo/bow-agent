import type { PolicyDomain, HumanDecisionToken, HumanDecisionRecord } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import type { HumanDecisionTokenVerificationEngine } from '../governedPolicyDecisionIngestion/HumanDecisionTokenVerificationEngine.js';
import { type PolicyLifecycleRecord } from './GovernedPolicyLifecycleTypes.js';
import type { PolicyLifecycleStateManager } from './PolicyLifecycleStateManager.js';
import type { PolicyHealthObservationEngine } from './PolicyHealthObservationEngine.js';
import type { PolicyLifecycleInterlockCoordinator } from './PolicyLifecycleInterlockCoordinator.js';
export interface PrivilegedLifecycleOperationParams {
    tenantId: string;
    policyDomain: PolicyDomain;
    policyId: string;
    expectedVersion?: number;
    reason: string;
    token: HumanDecisionToken;
    record: HumanDecisionRecord;
}
export declare class GovernedOperationalControlGateway {
    private readonly stateManager;
    private readonly tokenVerifier?;
    private readonly healthEngine?;
    private readonly interlockCoordinator?;
    constructor(stateManager: PolicyLifecycleStateManager, tokenVerifier?: HumanDecisionTokenVerificationEngine | undefined, healthEngine?: PolicyHealthObservationEngine | undefined, interlockCoordinator?: PolicyLifecycleInterlockCoordinator | undefined);
    /**
     * Reinstate a SUSPENDED policy back to ACTIVE.
     * Strictly requires cryptographic Human Authority.
     */
    reinstateActivePolicy(params: PrivilegedLifecycleOperationParams): PolicyLifecycleRecord;
    /**
     * Override DEGRADED state and restore policy to ACTIVE.
     */
    overrideDegradation(params: PrivilegedLifecycleOperationParams): PolicyLifecycleRecord;
    /**
     * Decommission and permanently retire an active, suspended, or rolled-back policy.
     * RETIRED is strictly terminal.
     */
    retirePolicy(params: PrivilegedLifecycleOperationParams): PolicyLifecycleRecord;
    /**
     * Operator-initiated manual suspension of an active policy.
     */
    manualSuspend(params: PrivilegedLifecycleOperationParams): PolicyLifecycleRecord;
    /**
     * Cryptographic verification and constitutional assertions.
     */
    private assertHumanAuthority;
}
