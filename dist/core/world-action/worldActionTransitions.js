// src/core/world-action/worldActionTransitions.ts
// BOWCON V4.0 — MS-1.3.33: REAL BOWCON WORLD ACTION & GOVERNED EXECUTION RUNTIME
//
// Authoritative Action State Transition Matrix and invariant enforcement.
export const VALID_ACTION_TRANSITIONS = {
    REQUESTED: ['UNDERSTOOD', 'DENIED', 'CANCELLED', 'FAILED'],
    UNDERSTOOD: ['PLANNED', 'DENIED', 'CANCELLED', 'FAILED'],
    PLANNED: ['AUTHORIZATION_REQUIRED', 'AUTHORIZED', 'DENIED', 'CANCELLED', 'FAILED'],
    AUTHORIZATION_REQUIRED: ['AWAITING_CONFIRMATION', 'AUTHORIZED', 'DENIED', 'CANCELLED', 'FAILED'],
    AWAITING_CONFIRMATION: ['AUTHORIZED', 'DENIED', 'CANCELLED', 'FAILED'],
    AUTHORIZED: ['EXECUTING', 'CANCELLED', 'FAILED'],
    EXECUTING: ['VERIFYING', 'FAILED', 'CANCELLED'],
    VERIFYING: ['COMMITTED', 'FAILED', 'ROLLED_BACK'],
    COMMITTED: [], // Terminal
    DENIED: [], // Terminal
    FAILED: ['ROLLED_BACK'],
    ROLLED_BACK: [], // Terminal
    CANCELLED: [], // Terminal
};
export function isValidActionTransition(from, to) {
    if (from === to)
        return true;
    const allowed = VALID_ACTION_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
}
export function assertValidActionTransition(from, to, actionId) {
    if (!isValidActionTransition(from, to)) {
        throw new Error(`INVALID_WORLD_ACTION_TRANSITION: Action ${actionId ?? 'unknown'} cannot transition from "${from}" to "${to}".`);
    }
}
