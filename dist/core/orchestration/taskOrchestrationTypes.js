// src/core/orchestration/taskOrchestrationTypes.ts
// BOWCON V4.0 — MS-1.3.46: GOVERNED MULTI-AGENT TASK ORCHESTRATION & DISTRIBUTED EVIDENCE VERIFICATION
//
// Canonical type contracts, interfaces, and state machines for:
// - Governed multi-agent task orchestration
// - Parent/child task lifecycle management
// - Task dependency and sequencing control
// - Verifiable artifact handoffs
// - Cryptographic evidence aggregation
// - Evidence provenance and integrity verification
// - Partial/failed agent result reconciliation
// - Supervisor review before task completion
// - Cross-agent result contradiction detection
// - Safe orchestration recovery
//
// STRICT INVARIANTS:
// - MASTER_OWNER_AUTHORITY > BOW > BOWCON > PROJECTS
// - OWNER_DECISION > BOWCON_RECOMMENDATION
// - USER_STOP > EVERYTHING_AUTONOMOUS
// - REVOCATION > AGENT_INTENT
// - DELEGATION != AUTHORITY
// - DELEGATION != EXECUTION
// - CAPABILITY != AUTHORIZATION
// - AGENT != MASTER_OWNER
// - DEVICE != MASTER_OWNER
// - DEVICE_TRUST != EXECUTION_AUTHORITY
// - LEARNING != AUTHORIZATION
// - LEARNING != EXECUTION
// - PREDICTION != FACT
// - INFERENCE != FACT
// - MEMORY != TRUTH
// - EVIDENCE != AUTHORITY
// - VERIFICATION != AUTHORIZATION
// - TASK_COMPLETION != OWNER_APPROVAL
// - SUB_AGENT_RESULT != FACT
// - AGENT_COUNT != AUTHORITY_COUNT (No collective authority; consensus != authority)
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0
import { MASTER_OWNER_ID, AUTHORIZED_MASTER_OWNER_ALIASES, isMasterOwner, } from '../architecture/masterArchitectureIdentity.js';
export { MASTER_OWNER_ID, AUTHORIZED_MASTER_OWNER_ALIASES, isMasterOwner, };
export const TASK_ORCHESTRATION_SCHEMA_VERSION = '4.0.0';
export const ALL_TASK_EXECUTION_STATES = Object.freeze([
    'PLANNED',
    'PENDING',
    'ASSIGNED',
    'READY',
    'RUNNING',
    'WAITING_DEPENDENCY',
    'BLOCKED',
    'PARTIAL',
    'SUCCEEDED',
    'FAILED',
    'CANCELLED',
    'INTERRUPTED',
    'VERIFICATION_PENDING',
    'VERIFIED',
    'REJECTED',
]);
export const ALL_EVIDENCE_VERIFICATION_STATES = Object.freeze([
    'OBSERVED',
    'UNVERIFIED',
    'VERIFIED',
    'REJECTED',
    'CONTRADICTED',
    'INCOMPLETE',
    'UNKNOWN',
]);
