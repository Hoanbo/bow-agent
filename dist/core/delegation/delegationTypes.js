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
import { MASTER_OWNER_ID, AUTHORIZED_MASTER_OWNER_ALIASES, isMasterOwner, } from '../partnership/partnershipTypes.js';
export { MASTER_OWNER_ID, AUTHORIZED_MASTER_OWNER_ALIASES, isMasterOwner, };
export const DELEGATION_SCHEMA_VERSION = '4.0.0';
export const ALL_DELEGATION_STATES = Object.freeze([
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
export const ALL_DEVICE_TRUST_STATES = Object.freeze([
    'UNREGISTERED',
    'REGISTERED',
    'TRUST_PENDING',
    'TRUSTED',
    'SUSPENDED',
    'REVOKED',
    'OFFLINE',
    'UNKNOWN',
]);
