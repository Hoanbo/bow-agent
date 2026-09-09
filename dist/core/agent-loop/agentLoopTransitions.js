// src/core/agent-loop/agentLoopTransitions.ts
// BOWCON V4.0 — MS-1.3.36: REAL BOWCON CONTINUOUS AGENT OPERATING LOOP & CONTROLLED AUTONOMY RUNTIME
//
// Authoritative Transition Matrix and Invariant Guards.
export const VALID_LOOP_TRANSITIONS = {
    BOOTING: ['SELF_CHECK', 'READY', 'STOPPING', 'STOPPED', 'FAILED'],
    SELF_CHECK: ['READY', 'STOPPING', 'STOPPED', 'FAILED'],
    READY: ['OBSERVING', 'PAUSED', 'STOPPING', 'STOPPED', 'FAILED'],
    OBSERVING: ['STATE_RECONSTRUCTION', 'READY', 'PAUSED', 'STOPPING', 'STOPPED', 'FAILED'],
    STATE_RECONSTRUCTION: ['REASONING', 'READY', 'PAUSED', 'STOPPING', 'STOPPED', 'FAILED'],
    REASONING: ['PLANNING', 'READY', 'PAUSED', 'STOPPING', 'STOPPED', 'FAILED'],
    PLANNING: ['GOVERNANCE_CHECK', 'READY', 'PAUSED', 'STOPPING', 'STOPPED', 'FAILED'],
    GOVERNANCE_CHECK: ['WAITING_FOR_AUTHORIZATION', 'AUTHORIZED', 'EXECUTING', 'REASONING', 'READY', 'PAUSED', 'STOPPING', 'STOPPED', 'FAILED'],
    WAITING_FOR_AUTHORIZATION: ['AUTHORIZED', 'REASONING', 'READY', 'PAUSED', 'STOPPING', 'STOPPED', 'FAILED'],
    AUTHORIZED: ['EXECUTING', 'PAUSED', 'STOPPING', 'STOPPED', 'FAILED'],
    EXECUTING: ['VERIFYING', 'RECOVERING', 'PAUSED', 'STOPPING', 'STOPPED', 'FAILED'],
    VERIFYING: ['EVALUATING', 'RECOVERING', 'PAUSED', 'STOPPING', 'STOPPED', 'FAILED'],
    EVALUATING: ['OBSERVING', 'READY', 'RECOVERING', 'PAUSED', 'STOPPING', 'STOPPED', 'FAILED'],
    RECOVERING: ['OBSERVING', 'VERIFYING', 'ESCALATING', 'READY', 'PAUSED', 'STOPPING', 'STOPPED', 'FAILED'],
    ESCALATING: ['WAITING_FOR_AUTHORIZATION', 'READY', 'PAUSED', 'STOPPING', 'STOPPED', 'FAILED'],
    PAUSED: ['OBSERVING', 'READY', 'STOPPING', 'STOPPED', 'FAILED'],
    STOPPING: ['STOPPED', 'FAILED'],
    STOPPED: ['BOOTING', 'SELF_CHECK', 'READY', 'PAUSED'],
    FAILED: ['BOOTING', 'SELF_CHECK', 'READY', 'STOPPED'],
};
export function isValidLoopTransition(from, to) {
    if (from === to)
        return true;
    const allowed = VALID_LOOP_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
}
export function assertValidLoopTransition(from, to, context) {
    if (!isValidLoopTransition(from, to)) {
        const ctx = context ? ` (context: ${context})` : '';
        throw new Error(`INVALID_LOOP_TRANSITION: Cannot transition AgentLoop from "${from}" to "${to}"${ctx}.`);
    }
}
