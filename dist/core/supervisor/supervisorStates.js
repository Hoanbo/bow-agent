// src/core/supervisor/supervisorStates.ts
// BOWCON V4.0 — MS-1.3.35: REAL BOWCON SUPERVISORY AUTONOMOUS RECOVERY & HUMAN GOVERNANCE RUNTIME
//
// 16-State Supervisory Lifecycle State Machine Taxonomy and Predicates.
export function isSupervisorOperationalState(state) {
    return state === 'HEALTHY' || state === 'OBSERVING';
}
export function isRecoveryActive(state) {
    return state === 'RECOVERING' || state === 'VERIFYING';
}
export function isWaitingForHuman(state) {
    return state === 'WAITING_FOR_HUMAN';
}
export function isSafeStop(state) {
    return state === 'SAFE_STOP';
}
export function canInitiateRecovery(state) {
    return state === 'AUTHORIZED' || state === 'POLICY_EVALUATION';
}
