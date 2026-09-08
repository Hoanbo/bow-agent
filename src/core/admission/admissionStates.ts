// src/core/admission/admissionStates.ts
// BOWCON V4.0 — ZERO-TRUST ALWAYS-ON BRAIN CONNECTIVITY & SECURE INTERNET ADMISSION RUNTIME (MS-1.3.26)
//
// 16 discrete canonical admission states representing the full zero-trust evaluation pipeline.
// Invariant: Fail-closed. State transitions MUST be explicit.

export type AdmissionState =
  | 'ADMISSION_RECEIVED'
  | 'TRANSPORT_VALIDATING'
  | 'PROTOCOL_VALIDATING'
  | 'SCOPE_VALIDATING'
  | 'IDENTITY_RESOLVING'
  | 'TRUST_RESOLVING'
  | 'CHALLENGE_REQUIRED'
  | 'PROOF_REQUIRED'
  | 'PROOF_VALIDATING'
  | 'REPLAY_VALIDATING'
  | 'REVOCATION_VALIDATING'
  | 'SESSION_VALIDATING'
  | 'CAPABILITY_FILTERING'
  | 'ADMITTED'
  | 'REJECTED'
  | 'TERMINATED';

export const ALL_ADMISSION_STATES: readonly AdmissionState[] = Object.freeze([
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

const ADMISSION_STATES_SET = new Set<string>(ALL_ADMISSION_STATES);

const TERMINAL_ADMISSION_STATES = new Set<AdmissionState>([
  'ADMITTED',
  'REJECTED',
  'TERMINATED',
]);

const VALIDATING_ADMISSION_STATES = new Set<AdmissionState>([
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

export function isValidAdmissionState(state: unknown): state is AdmissionState {
  return typeof state === 'string' && ADMISSION_STATES_SET.has(state);
}

export function isTerminalAdmissionState(state: AdmissionState): boolean {
  return TERMINAL_ADMISSION_STATES.has(state);
}

export function isValidatingAdmissionState(state: AdmissionState): boolean {
  return VALIDATING_ADMISSION_STATES.has(state);
}

export function isAdmittedState(state: AdmissionState): boolean {
  return state === 'ADMITTED';
}

export function isRejectedState(state: AdmissionState): boolean {
  return state === 'REJECTED';
}

export const isAdmissionSuccessState = isAdmittedState;
export const isAdmissionFailureState = isRejectedState;

export function isPreAdmissionState(state: AdmissionState): boolean {
  return state === 'ADMISSION_RECEIVED';
}

