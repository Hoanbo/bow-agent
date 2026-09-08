// src/core/brain-service/brainServiceTransitions.ts
// BOWCON V4.0 — MS-1.3.31: REAL BOWCON BRAIN SERVICE & CONTINUOUS RUNTIME
//
// Fail-Closed Lifecycle State Transition Matrix for BrainService.
export const VALID_SERVICE_TRANSITIONS = Object.freeze({
    CREATED: ['INITIALIZING', 'FAILED'],
    INITIALIZING: ['LOADING_STATE', 'FAILED'],
    LOADING_STATE: ['READY', 'DEGRADED', 'FAILED'],
    READY: ['RECEIVING', 'SHUTTING_DOWN', 'DEGRADED', 'FAILED'],
    RECEIVING: ['PROCESSING', 'READY', 'RECOVERING', 'DEGRADED', 'FAILED'],
    PROCESSING: ['PLANNING', 'EXECUTING', 'RECOVERING', 'DEGRADED', 'FAILED'],
    PLANNING: ['EXECUTING', 'RECOVERING', 'DEGRADED', 'FAILED'],
    EXECUTING: ['VERIFYING', 'RECOVERING', 'DEGRADED', 'FAILED'],
    VERIFYING: ['COMMITTING', 'RECOVERING', 'DEGRADED', 'FAILED'],
    COMMITTING: ['RESPONDING', 'RECOVERING', 'DEGRADED', 'FAILED'],
    RESPONDING: ['READY', 'DEGRADED', 'FAILED'],
    DEGRADED: ['READY', 'RECEIVING', 'RECOVERING', 'SHUTTING_DOWN', 'FAILED'],
    RECOVERING: ['READY', 'DEGRADED', 'FAILED'],
    SHUTTING_DOWN: ['STOPPED', 'FAILED'],
    STOPPED: [],
    FAILED: ['RECOVERING', 'SHUTTING_DOWN', 'STOPPED'],
});
export function isValidServiceTransition(from, to) {
    if (from === to)
        return true;
    const allowed = VALID_SERVICE_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
}
export function assertValidServiceTransition(from, to) {
    if (!isValidServiceTransition(from, to)) {
        throw new Error(`[BrainService] Illegal state transition: "${from}" -> "${to}". Transition not permitted.`);
    }
}
