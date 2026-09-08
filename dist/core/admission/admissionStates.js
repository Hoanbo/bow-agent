// src/core/admission/admissionStates.ts
// BOWCON V4.0 — ZERO-TRUST ALWAYS-ON BRAIN CONNECTIVITY & SECURE INTERNET ADMISSION RUNTIME (MS-1.3.26)
//
// 16 discrete canonical admission states representing the full zero-trust evaluation pipeline.
// Invariant: Fail-closed. State transitions MUST be explicit.
export const ALL_ADMISSION_STATES = Object.freeze([
    'ADMISSION_RECEIVED',
    'TRANSPORT_VALIDATING',
    'PROTOCOL_VALIDATING',
    'SCOPE_VALIDATING',
    'IDENTITY_RESOLVING',
    'TRUST_RESOLVING',
    'CHALLENGE_REQUIRED',
    'PROOF_REQUIRED',
    'PROOF_VALIDATING',
    'REPLAY_VALIDATING',
    'REVOCATION_VALIDATING',
    'SESSION_VALIDATING',
    'CAPABILITY_FILTERING',
    'ADMITTED',
    'REJECTED',
    'TERMINATED',
]);
const ADMISSION_STATES_SET = new Set(ALL_ADMISSION_STATES);
const TERMINAL_ADMISSION_STATES = new Set([
    'ADMITTED',
    'REJECTED',
    'TERMINATED',
]);
const VALIDATING_ADMISSION_STATES = new Set([
    'TRANSPORT_VALIDATING',
    'PROTOCOL_VALIDATING',
    'SCOPE_VALIDATING',
    'IDENTITY_RESOLVING',
    'TRUST_RESOLVING',
    'PROOF_VALIDATING',
    'REPLAY_VALIDATING',
    'REVOCATION_VALIDATING',
    'SESSION_VALIDATING',
    'CAPABILITY_FILTERING',
]);
export function isValidAdmissionState(state) {
    return typeof state === 'string' && ADMISSION_STATES_SET.has(state);
}
export function isTerminalAdmissionState(state) {
    return TERMINAL_ADMISSION_STATES.has(state);
}
export function isValidatingAdmissionState(state) {
    return VALIDATING_ADMISSION_STATES.has(state);
}
export function isAdmittedState(state) {
    return state === 'ADMITTED';
}
export function isRejectedState(state) {
    return state === 'REJECTED';
}
export const isAdmissionSuccessState = isAdmittedState;
export const isAdmissionFailureState = isRejectedState;
export function isPreAdmissionState(state) {
    return state === 'ADMISSION_RECEIVED';
}
