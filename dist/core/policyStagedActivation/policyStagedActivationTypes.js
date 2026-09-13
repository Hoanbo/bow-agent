// src/core/policyStagedActivation/policyStagedActivationTypes.ts
// BOWCON V4.0 — MS-1.3.70: GOVERNED STAGED POLICY ACTIVATION LAYER
//
// Canonical type definitions, branded identifiers, and immutable DTO contracts for
// governed staged policy activation, independent pre-activation revalidation,
// preflight verification, the explicit human activation boundary, atomic active state transition,
// durable isolated persistence, and cryptographic provenance chaining.
//
// Authority Invariants:
// - CANDIDATE_DRAFT != VALIDATED_CANDIDATE
// - VALIDATED_CANDIDATE != AUTHORIZED_CANDIDATE
// - AUTHORIZED_CANDIDATE != ACTIVATION_READY
// - ACTIVATION_READY != STAGED_POLICY
// - STAGED_POLICY != ACTIVE_POLICY
// - NO AUTONOMOUS ACTIVATION (HUMAN_AUTHORIZATION > AUTONOMOUS_AUTHORIZATION)
// - NO AUTONOMOUS PROMOTION
// - NO AUTONOMOUS ROLLBACK
// - NO DIRECT TOOL EXECUTION
// - USER_STOP > EVERYTHING
export function createStagedActivationId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_STAGED_ACTIVATION_ID: raw staged activation id must be a non-empty string');
    }
    return raw;
}
export function createActivationPreflightId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_ACTIVATION_PREFLIGHT_ID: raw preflight id must be a non-empty string');
    }
    return raw;
}
export function createActivationCommitId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_ACTIVATION_COMMIT_ID: raw commit id must be a non-empty string');
    }
    return raw;
}
export function createActivePolicyStateId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_ACTIVE_POLICY_STATE_ID: raw active policy state id must be a non-empty string');
    }
    return raw;
}
export function createStagedActivationProvenanceId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_STAGED_ACTIVATION_PROVENANCE_ID: raw provenance id must be a non-empty string');
    }
    return raw;
}
