// src/core/delegation/delegationTypes.ts
// BOWCON V4.0 — MS-1.3.45: MASTER OWNER DELEGATION GOVERNANCE & AUTHORITY LEASE ARCHITECTURE
//
// Canonical type contracts, interfaces, and state machines for:
// - Master Owner delegation
// - Agent identity
// - Device identity
// - Delegation scopes
// - Capability leases
// - Expiration & revocation
// - Parent-child delegation constraints
// - Cross-device federation metadata
// - Result/evidence return
// - Delegation verification
// - Session isolation
// - Auditability
//
// STRICT INVARIANTS:
// - MASTER_OWNER_AUTHORITY > BOW > BOWCON > PROJECTS
// - OWNER_DECISION > BOWCON_RECOMMENDATION
// - USER_STOP > EVERYTHING_AUTONOMOUS
// - DELEGATION != AUTHORITY
// - RECOMMENDATION != EXECUTION
// - LEARNING != AUTHORIZATION
// - LEARNING != EXECUTION
// - PREDICTION != FACT
// - INFERENCE != FACT
// - MEMORY != TRUTH
// - SELF_REFLECTION != AUTHORITY
// - AGENT != MASTER_OWNER
// - DEVICE != MASTER_OWNER
// - DELEGATED_AUTHORITY <= OWNER_GRANTED_SCOPE
// - CHILD_DELEGATION_SCOPE <= PARENT_DELEGATION_SCOPE
// - CHILD_CAPABILITIES ⊆ PARENT_CAPABILITIES
// - CHILD_EXPIRATION <= PARENT_EXPIRATION
// - CHILD_CONSTRAINTS ⊇ PARENT_CONSTRAINTS
// - REVOCATION > AGENT_INTENT
// - CAPABILITY != AUTHORIZATION
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0

import {
  MASTER_OWNER_ID,
  AUTHORIZED_MASTER_OWNER_ALIASES,
  isMasterOwner,
} from '../partnership/partnershipTypes.js';

export {
  MASTER_OWNER_ID,
  AUTHORIZED_MASTER_OWNER_ALIASES,
  isMasterOwner,
};

export const DELEGATION_SCHEMA_VERSION = '4.0.0' as const;

/**
 * Delegation states forming an authoritative governed state machine.
 */
export type DelegationState =
  | 'REQUESTED'
  | 'PENDING_AUTHORIZATION'
  | 'AUTHORIZED'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'EXPIRED'
  | 'REVOKED'
  | 'COMPLETED'
  | 'FAILED'
  | 'BLOCKED'
  | 'REJECTED';

export const ALL_DELEGATION_STATES: readonly DelegationState[] = Object.freeze([
  'REQUESTED',
  'PENDING_AUTHORIZATION',
  'AUTHORIZED',
  'ACTIVE',
  'SUSPENDED',
  'EXPIRED',
  'REVOKED',
  'COMPLETED',
  'FAILED',
  'BLOCKED',
  'REJECTED',
]);

/**
 * Capability lease states.
 */
export type CapabilityLeaseState = 'ACTIVE' | 'EXPIRED' | 'REVOKED';

/**
 * Device trust states in the federation model.
 */
export type DeviceTrustState =
  | 'UNREGISTERED'
  | 'REGISTERED'
  | 'TRUST_PENDING'
  | 'TRUSTED'
  | 'SUSPENDED'
  | 'REVOKED'
  | 'OFFLINE'
  | 'UNKNOWN';

export const ALL_DEVICE_TRUST_STATES: readonly DeviceTrustState[] = Object.freeze([
  'UNREGISTERED',
  'REGISTERED',
  'TRUST_PENDING',
  'TRUSTED',
  'SUSPENDED',
  'REVOKED',
  'OFFLINE',
  'UNKNOWN',
]);

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
  readonly maxScopePercentage: number; // 0 to 100
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
  readonly grantedTo: string; // agentId
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
