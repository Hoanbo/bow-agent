// src/core/policyActiveRuntime/policyActiveRuntimeTypes.ts
// BOWCON V4.0 — MS-1.3.71: GOVERNED ACTIVE POLICY RUNTIME SYNCHRONIZATION & ENFORCEMENT BRIDGE
//
// Canonical type definitions and DTO contracts for governed active policy runtime synchronization,
// snapshot resolution, freshness validation, PDP evaluation bridge, PEP enforcement bridge,
// cryptographic provenance, and audit logging.
//
// Core Authority Invariants:
// - ACTIVE_POLICY != RUNTIME_POLICY_SNAPSHOT
// - RUNTIME_POLICY_SNAPSHOT != POLICY_MUTATION
// - PDP != POLICY_AUTHORITY
// - PEP != POLICY_AUTHORITY
// - ZERO AUTONOMOUS POLICY MUTATION
// - ZERO AUTONOMOUS POLICY ACTIVATION
// - ZERO AUTONOMOUS ROLLBACK
// - ZERO DIRECT TOOL EXECUTION
// - USER_STOP > EVERYTHING
export function createActiveRuntimeSyncId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_SYNC_ID: ActiveRuntimeSyncId must be a non-empty string');
    }
    return raw.trim();
}
export function createRuntimePolicySnapshotId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_SNAPSHOT_ID: RuntimePolicySnapshotId must be a non-empty string');
    }
    return raw.trim();
}
export function createRuntimePolicyEnforcementId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_ENFORCEMENT_ID: RuntimePolicyEnforcementId must be a non-empty string');
    }
    return raw.trim();
}
export function createActiveRuntimeProvenanceId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_PROVENANCE_ID: ActiveRuntimeProvenanceId must be a non-empty string');
    }
    return raw.trim();
}
