// src/core/policyActiveLifecycleReconciliation/policyActiveLifecycleReconciliationTypes.ts
// BOWCON V4.0 — MS-1.3.73: GOVERNED ACTIVE POLICY LIFECYCLE RECONCILIATION & CONSISTENCY VERIFICATION
//
// Canonical Contracts & DTOs (Component 819).
// Defines immutable branded types, explicit lifecycle states, and deterministic
// reconciliation DTOs for verifying internal consistency across active policies,
// runtime snapshots, PDP evaluations, PEP enforcement, rollback/sunset/recovery states,
// cryptographic provenance, and audit logs.
//
// Core Authority Invariants:
// - OBSERVATION != EVIDENCE != INVESTIGATION != DECISION != AUTHORIZATION
// - ACTIVE_POLICY != RUNTIME_POLICY_SNAPSHOT != PDP_STATE != PEP_ENFORCEMENT_STATE
// - ROLLBACK_STATE != SUNSET_STATE != RECOVERY_STATE != RECONCILIATION_RESULT
// - RECONCILIATION != POLICY_AUTHORITY
// - RECONCILIATION != POLICY_MUTATION
// - RECONCILIATION != AUTONOMOUS_REPAIR
// - HUMAN_AUTHORIZATION > AUTONOMOUS_AUTHORIZATION
// - USER_STOP > EVERYTHING
// - ZERO AUTONOMOUS POLICY MUTATION
// - ZERO AUTONOMOUS POLICY ACTIVATION
// - ZERO AUTONOMOUS ROLLBACK / SUNSET / RECOVERY
// - ZERO AUTONOMOUS REPAIR
// - ZERO DIRECT TOOL EXECUTION
// - FAIL_CLOSED
export function createLifecycleReconciliationId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_RECONCILIATION_ID: raw reconciliation id must be a non-empty string');
    }
    return raw.trim();
}
export function createLifecycleConsistencyCheckId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_CONSISTENCY_CHECK_ID: raw check id must be a non-empty string');
    }
    return raw.trim();
}
export function createLifecycleDriftId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_DRIFT_ID: raw drift id must be a non-empty string');
    }
    return raw.trim();
}
export function createRuntimeConsistencyId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_RUNTIME_CONSISTENCY_ID: raw runtime consistency id must be a non-empty string');
    }
    return raw.trim();
}
export function createLifecycleVerificationId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_VERIFICATION_ID: raw verification id must be a non-empty string');
    }
    return raw.trim();
}
export function createReconciliationProvenanceId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_RECONCILIATION_PROVENANCE_ID: raw provenance id must be a non-empty string');
    }
    return raw.trim();
}
