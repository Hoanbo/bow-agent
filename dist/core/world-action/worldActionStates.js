// src/core/world-action/worldActionStates.ts
// BOWCON V4.0 — MS-1.3.33: REAL BOWCON WORLD ACTION & GOVERNED EXECUTION RUNTIME
//
// Lifecycle state definitions, state queries, and invariants for governed physical host actions.
export const TERMINAL_ACTION_STATES = new Set([
    'COMMITTED',
    'DENIED',
    'FAILED',
    'ROLLED_BACK',
    'CANCELLED',
]);
export function isActionTerminal(state) {
    return TERMINAL_ACTION_STATES.has(state);
}
export function isActionActive(state) {
    return !TERMINAL_ACTION_STATES.has(state);
}
export function canActionPrepare(state) {
    return state === 'REQUESTED' || state === 'UNDERSTOOD';
}
export function canActionAuthorize(state) {
    return state === 'PLANNED' || state === 'AUTHORIZATION_REQUIRED' || state === 'AWAITING_CONFIRMATION';
}
export function canActionExecute(lifecycleState, authState, execState) {
    if (lifecycleState !== 'AUTHORIZED')
        return false;
    if (authState !== 'AUTHORIZED' && authState !== 'NOT_REQUIRED')
        return false;
    if (execState !== 'PREPARED')
        return false;
    return true;
}
export function canActionVerify(lifecycleState, execState) {
    return lifecycleState === 'EXECUTING' && execState === 'EXECUTED';
}
export function canActionCommit(lifecycleState, verifState) {
    return lifecycleState === 'VERIFYING' && verifState === 'VERIFIED';
}
