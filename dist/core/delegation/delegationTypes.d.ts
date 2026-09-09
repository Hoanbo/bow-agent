import { MASTER_OWNER_ID, AUTHORIZED_MASTER_OWNER_ALIASES, isMasterOwner } from '../partnership/partnershipTypes.js';
export { MASTER_OWNER_ID, AUTHORIZED_MASTER_OWNER_ALIASES, isMasterOwner, };
export declare const DELEGATION_SCHEMA_VERSION: "4.0.0";
/**
 * Delegation states forming an authoritative governed state machine.
 */
export type DelegationState = 'REQUESTED' | 'PENDING_AUTHORIZATION' | 'AUTHORIZED' | 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'REVOKED' | 'COMPLETED' | 'FAILED' | 'BLOCKED' | 'REJECTED';
export declare const ALL_DELEGATION_STATES: readonly DelegationState[];
/**
 * Capability lease states.
 */
export type CapabilityLeaseState = 'ACTIVE' | 'EXPIRED' | 'REVOKED';
/**
 * Device trust states in the federation model.
 */
export type DeviceTrustState = 'UNREGISTERED' | 'REGISTERED' | 'TRUST_PENDING' | 'TRUSTED' | 'SUSPENDED' | 'REVOKED' | 'OFFLINE' | 'UNKNOWN';
export declare const ALL_DEVICE_TRUST_STATES: readonly DeviceTrustState[];
/**
 * Governed Agent Identity.
 * INVARIANT: AGENT_ID != MASTER_OWNER_ID.
 */
export interface AgentIdentity {
    readonly agentId: string;
    readonly name: string;
    readonly role: string;
    readonly parentAgentId?: string;
    readonly sessionId: string;
    readonly ownerId: string;
    readonly createdAt: number;
    readonly isMasterOwner: false;
}
/**
 * Federated Device Identity Metadata.
 * INVARIANT: DEVICE_ID != MASTER_OWNER_ID and DEVICE_TRUST != EXECUTION_AUTHORITY.
 */
export interface FederatedDeviceIdentity {
    readonly deviceId: string;
    readonly ownerId: string;
    readonly platform: string;
    readonly hostMode: string;
    readonly trustState: DeviceTrustState;
    readonly capabilitiesSummary: readonly string[];
    readonly lastSeenAt: number;
    readonly federationStatus: 'ACTIVE' | 'SUSPENDED' | 'DISCONNECTED';
    readonly isMasterOwner: false;
}
/**
 * Scope constraints for a delegation.
 * INVARIANTS:
 * - DELEGATED_AUTHORITY <= OWNER_GRANTED_SCOPE
 * - CHILD_DELEGATION_SCOPE <= PARENT_DELEGATION_SCOPE
 * - CHILD_CAPABILITIES ⊆ PARENT_CAPABILITIES
 */
export interface DelegationScope {
    readonly maxScopePercentage: number;
    readonly allowedCapabilities: readonly string[];
    readonly disallowedCapabilities: readonly string[];
    readonly targetPaths: readonly string[];
    readonly forbiddenPaths: readonly string[];
    readonly maxChildDelegationDepth: number;
    readonly currentDepth: number;
    readonly allowSubDelegation: boolean;
}
/**
 * Time-bounded, scoped, revocable capability lease.
 * INVARIANT: CAPABILITY != AUTHORIZATION.
 */
export interface CapabilityLease {
    readonly leaseId: string;
    readonly delegationId: string;
    readonly capabilityId: string;
    readonly grantedBy: string;
    readonly grantedTo: string;
    readonly deviceId: string;
    readonly sessionId: string;
    readonly issuedAt: number;
    readonly expiresAt: number;
    readonly isRevoked: boolean;
    readonly revokedAt?: number;
    readonly revokedBy?: string;
    readonly revocationReason?: string;
    readonly status: CapabilityLeaseState;
}
/**
 * Return evidence produced by delegated execution.
 */
export interface DelegationEvidence {
    readonly status: 'SUCCESS' | 'FAILURE' | 'BLOCKED' | 'PARTIAL';
    readonly completedAt: number;
    readonly summary: string;
    readonly artifacts?: readonly string[];
    readonly verifiedOutcome?: boolean;
    readonly notes?: string;
}
/**
 * Complete delegation record.
 */
export interface DelegationRecord {
    readonly delegationId: string;
    readonly ownerId: string;
    readonly issuerIdentity: {
        readonly id: string;
        readonly type: 'MASTER_OWNER' | 'AGENT';
    };
    readonly targetAgentId: string;
    readonly targetDeviceId: string;
    readonly parentDelegationId?: string;
    readonly requestedCapabilities: readonly string[];
    readonly grantedCapabilities: readonly string[];
    readonly scope: DelegationScope;
    readonly createdAt: number;
    readonly expiresAt: number;
    readonly status: DelegationState;
    readonly revocationState: {
        readonly isRevoked: boolean;
        readonly revokedAt?: number;
        readonly revokedBy?: string;
        readonly reason?: string;
    };
    readonly parentGoalId?: string;
    readonly sessionId: string;
    readonly provenance: readonly string[];
    readonly resultEvidence?: DelegationEvidence;
    readonly schemaVersion: typeof DELEGATION_SCHEMA_VERSION;
}
/**
 * Delegation request parameters submitted to the governance runtime.
 */
export interface DelegationRequestInput {
    readonly ownerId: string;
    readonly issuerId: string;
    readonly targetAgentId: string;
    readonly targetDeviceId: string;
    readonly parentDelegationId?: string;
    readonly requestedCapabilities: readonly string[];
    readonly scope: {
        readonly maxScopePercentage: number;
        readonly allowedCapabilities: readonly string[];
        readonly disallowedCapabilities?: readonly string[];
        readonly targetPaths?: readonly string[];
        readonly forbiddenPaths?: readonly string[];
        readonly maxChildDelegationDepth?: number;
        readonly allowSubDelegation?: boolean;
    };
    readonly ttlMs: number;
    readonly parentGoalId?: string;
    readonly sessionId: string;
    readonly provenance?: readonly string[];
}
