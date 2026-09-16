import type { PolicyDomain } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import { type PolicyLifecycleState, type PolicyLifecycleRecord } from './GovernedPolicyLifecycleTypes.js';
import type { PolicyLifecycleAuditLedger } from './PolicyLifecycleAuditLedger.js';
import type { PolicyLifecycleInterlockCoordinator } from './PolicyLifecycleInterlockCoordinator.js';
export interface TransitionRequestParams {
    tenantId: string;
    policyDomain: PolicyDomain;
    policyId: string;
    targetState: PolicyLifecycleState;
    reason: string;
    trigger: PolicyLifecycleRecord['transitionTrigger'];
    expectedVersion?: number;
    authorizationRef?: PolicyLifecycleRecord['authorizationRef'];
    canonicalPolicyHash?: string;
    ratificationId?: string;
}
export declare class PolicyLifecycleStateManager {
    private readonly auditLedger?;
    private readonly interlockCoordinator?;
    private readonly stateStore;
    private readonly singleFlightLocks;
    private readonly partitionDir;
    constructor(customStoreDir?: string, auditLedger?: PolicyLifecycleAuditLedger | undefined, interlockCoordinator?: PolicyLifecycleInterlockCoordinator | undefined);
    /**
     * Transition policy operational lifecycle state.
     */
    transitionState(params: TransitionRequestParams): PolicyLifecycleRecord;
    /**
     * Retrieve current lifecycle state of a policy.
     */
    getLifecycleState(tenantId: string, policyDomain: PolicyDomain, policyId: string): PolicyLifecycleRecord | undefined;
    /**
     * Register initial ratified policy into lifecycle tracking.
     */
    registerRatifiedPolicy(params: {
        tenantId: string;
        policyDomain: PolicyDomain;
        policyId: string;
        policyVersion: number;
        canonicalPolicyHash: string;
        ratificationId: string;
    }): PolicyLifecycleRecord;
    /**
     * Assert valid transition between FSM states.
     */
    private assertValidTransition;
    /**
     * Multi-tenant scope and Windows filesystem sanitization.
     */
    private validateScope;
    /**
     * 4-Step Atomic Persistence: .tmp -> readback verify -> .bak -> atomic rename.
     */
    private persistRecordAtomically;
    private loadFromDisk;
}
