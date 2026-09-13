// src/core/policyPhaseTransition/policyPhaseTransitionTypes.ts
// BOWCON V4.0 — MS-1.3.77: GOVERNED PHASE EXIT AUTHORIZATION, TRANSITION & PHASE 1.4 ENTRY BOUNDARY
//
// Canonical Contracts & DTOs (Component 870).
// Defines branded types, phase lifecycle state taxonomy, authorization contracts,
// candidate reviews, and atomic transition commit envelopes.
//
// Core Authority Invariants:
// - READINESS != AUTHORIZATION
// - RECOMMENDATION != DECLARATION
// - PHASE_EXIT_CANDIDATE != PHASE_EXIT_COMMIT
// - PHASE_EXIT_COMMIT != PHASE_1_4_ENTRY
// - PHASE_1_4_ENTRY_READY != PHASE_1_4_ENTRY_COMMIT
// - HUMAN_AUTHORIZATION > AUTONOMOUS_AUTHORIZATION
// - AUTONOMOUS_PHASE_EXIT = FORBIDDEN
// - AUTONOMOUS_PHASE_1_4_ENTRY = FORBIDDEN
// - PHASE_TRANSITION != POLICY_MUTATION
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED
export function createPhaseExitCandidateId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_PHASE_EXIT_CANDIDATE_ID: raw id must be a non-empty string');
    }
    return raw.trim();
}
export function createPhaseExitAuthorizationId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_PHASE_EXIT_AUTHORIZATION_ID: raw id must be a non-empty string');
    }
    return raw.trim();
}
export function createPhaseExitCommitId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_PHASE_EXIT_COMMIT_ID: raw id must be a non-empty string');
    }
    return raw.trim();
}
export function createPhase14EntryReadinessId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_PHASE_1_4_ENTRY_READINESS_ID: raw id must be a non-empty string');
    }
    return raw.trim();
}
export function createPhase14EntryAuthorizationId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_PHASE_1_4_ENTRY_AUTHORIZATION_ID: raw id must be a non-empty string');
    }
    return raw.trim();
}
export function createPhase14EntryCommitId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_PHASE_1_4_ENTRY_COMMIT_ID: raw id must be a non-empty string');
    }
    return raw.trim();
}
export function createPhaseTransitionProvenanceId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_PHASE_TRANSITION_PROVENANCE_ID: raw id must be a non-empty string');
    }
    return raw.trim();
}
