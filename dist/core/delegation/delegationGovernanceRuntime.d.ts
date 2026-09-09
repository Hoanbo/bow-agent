import type { DelegationRecord, DelegationRequestInput, CapabilityLease, DelegationEvidence } from './delegationTypes.js';
import { AgentIdentityManager } from './agentIdentityManager.js';
import { FederatedDeviceRegistry } from './federatedDeviceRegistry.js';
import { CapabilityLeaseManager } from './capabilityLeaseManager.js';
import { DurableDelegationStore } from './durableDelegationStore.js';
export declare class DelegationGovernanceError extends Error {
    readonly code: string;
    readonly details?: Record<string, unknown> | undefined;
    constructor(code: string, message: string, details?: Record<string, unknown> | undefined);
}
export declare class DelegationGovernanceRuntime {
    readonly agentIdentityManager: AgentIdentityManager;
    readonly deviceRegistry: FederatedDeviceRegistry;
    readonly leaseManager: CapabilityLeaseManager;
    private delegations;
    private completedOrTerminalIds;
    private readonly store;
    constructor(agentIdentityManager?: AgentIdentityManager, deviceRegistry?: FederatedDeviceRegistry, leaseManager?: CapabilityLeaseManager, store?: DurableDelegationStore);
    /**
     * Submits a delegation request into PENDING_AUTHORIZATION.
     */
    requestDelegation(input: DelegationRequestInput): DelegationRecord;
    /**
     * Authorizes a pending delegation request.
     * STRICT INVARIANT: Only Master Owner authority can authorize a root delegation.
     */
    authorizeDelegation(delegationId: string, actorId: string, grantedCapabilities?: readonly string[]): DelegationRecord;
    /**
     * Activates an authorized delegation for active execution.
     */
    activateDelegation(delegationId: string, actorId: string): DelegationRecord;
    /**
     * Creates a governed child delegation from an active parent delegation.
     * STRICT INVARIANTS:
     * - CHILD_DELEGATION_SCOPE <= PARENT_DELEGATION_SCOPE
     * - CHILD_CAPABILITIES ⊆ PARENT_CAPABILITIES
     * - CHILD_EXPIRATION <= PARENT_EXPIRATION
     */
    createChildDelegation(parentDelegationId: string, childInput: DelegationRequestInput, actorId: string): DelegationRecord;
    /**
     * Grants a scoped, time-bounded capability lease under an active delegation.
     * INVARIANT: CAPABILITY != AUTHORIZATION.
     */
    grantCapabilityLease(delegationId: string, capabilityId: string, actorId: string, ttlMs: number): CapabilityLease;
    /**
     * Revokes a delegation and all of its descendants immediately.
     * INVARIANT: REVOCATION > AGENT_INTENT.
     */
    revokeDelegation(delegationId: string, revokedBy: string, reason?: string): DelegationRecord;
    /**
     * Completes a delegation and attaches execution evidence.
     */
    completeDelegation(delegationId: string, evidence: DelegationEvidence, actorId: string): DelegationRecord;
    getDelegation(delegationId: string): DelegationRecord | undefined;
    isDelegationActive(delegationId: string, now?: number): boolean;
    assertActiveDelegation(delegationId: string, sessionId: string, now?: number): DelegationRecord;
    saveDurableState(ownerSessionId: string): void;
    restoreDurableState(): boolean;
    clear(): void;
}
export declare const globalDelegationGovernance: DelegationGovernanceRuntime;
