// src/core/admission/admissionTransitions.ts
// BOWCON V4.0 — ZERO-TRUST ALWAYS-ON BRAIN CONNECTIVITY & SECURE INTERNET ADMISSION RUNTIME (MS-1.3.26)
//
// Finite state transition matrix enforcing fail-closed admission flow.
// Invariant: Unlisted transitions are strictly forbidden.
export const ADMISSION_STATE_TRANSITION_MATRIX = {
    ADMISSION_RECEIVED: ['TRANSPORT_VALIDATING', 'REJECTED'],
    TRANSPORT_VALIDATING: ['PROTOCOL_VALIDATING', 'REJECTED'],
    PROTOCOL_VALIDATING: ['SCOPE_VALIDATING', 'REJECTED'],
    SCOPE_VALIDATING: ['IDENTITY_RESOLVING', 'REJECTED'],
    IDENTITY_RESOLVING: ['TRUST_RESOLVING', 'REJECTED'],
    TRUST_RESOLVING: ['CHALLENGE_REQUIRED', 'PROOF_REQUIRED', 'PROOF_VALIDATING', 'SESSION_VALIDATING', 'REJECTED'],
    CHALLENGE_REQUIRED: ['PROOF_REQUIRED', 'REJECTED'],
    PROOF_REQUIRED: ['PROOF_VALIDATING', 'REJECTED'],
    PROOF_VALIDATING: ['REPLAY_VALIDATING', 'REJECTED'],
    REPLAY_VALIDATING: ['REVOCATION_VALIDATING', 'REJECTED'],
    REVOCATION_VALIDATING: ['SESSION_VALIDATING', 'REJECTED'],
    SESSION_VALIDATING: ['CAPABILITY_FILTERING', 'REJECTED'],
    CAPABILITY_FILTERING: ['ADMITTED', 'REJECTED'],
    ADMITTED: ['TERMINATED'],
    REJECTED: ['TERMINATED'],
    TERMINATED: [],
};
export function isValidAdmissionTransition(from, to) {
    const allowed = ADMISSION_STATE_TRANSITION_MATRIX[from];
    return Boolean(allowed && allowed.includes(to));
}
export function assertValidAdmissionTransition(from, to) {
    if (!isValidAdmissionTransition(from, to)) {
        throw new Error(`[ADMISSION_INVALID_TRANSITION] Forbidden state transition from ${from} to ${to}. Fail-closed.`);
    }
}
