// src/core/executive/executiveTransitions.ts
// BOWCON V4.0 — MS-1.3.37: REAL BOWCON EXECUTIVE TASK & LONG-HORIZON GOAL ORCHESTRATION RUNTIME
//
// Authoritative Transition Matrices for Goals and Tasks.
// Any attempt to perform an unauthorized or invalid state transition throws immediately (fails closed).
export class ExecutiveTransitionError extends Error {
    entityType;
    fromState;
    toState;
    context;
    constructor(entityType, fromState, toState, context) {
        super(`[EXECUTIVE_TRANSITION_DENIED] Illegal ${entityType} transition from '${fromState}' to '${toState}'${context ? ` (${context})` : ''}`);
        this.entityType = entityType;
        this.fromState = fromState;
        this.toState = toState;
        this.context = context;
        this.name = 'ExecutiveTransitionError';
    }
}
/**
 * Valid transitions for ExecutiveGoal states (18 states).
 */
const VALID_GOAL_TRANSITIONS = {
    SUBMITTED: new Set(['ACCEPTED', 'REJECTED', 'CANCELLED', 'STOPPED']),
    ACCEPTED: new Set(['INTERPRETING', 'DECOMPOSING', 'CANCELLED', 'STOPPED']),
    REJECTED: new Set([]), // Terminal
    CREATED: new Set(['INTERPRETING', 'READY', 'RUNNING', 'AWAITING_HUMAN', 'CANCELLED', 'STOPPED']),
    INTERPRETING: new Set(['INTERPRETED', 'DECOMPOSING', 'FAILED', 'CANCELLED', 'STOPPED']),
    INTERPRETED: new Set(['DECOMPOSING', 'CANCELLED', 'STOPPED', 'PAUSED']),
    DECOMPOSING: new Set(['DECOMPOSED', 'PLANNING', 'FAILED', 'CANCELLED', 'STOPPED']),
    DECOMPOSED: new Set(['PLANNING', 'CANCELLED', 'STOPPED', 'PAUSED']),
    PLANNING: new Set(['READY', 'FAILED', 'CANCELLED', 'STOPPED', 'PAUSED']),
    READY: new Set(['RUNNING', 'PAUSED', 'AWAITING_HUMAN', 'CANCELLED', 'STOPPED', 'BLOCKED']),
    RUNNING: new Set([
        'RUNNING', // self-transition allowed between steps
        'WAITING',
        'PAUSED',
        'BLOCKED',
        'RECOVERING',
        'AWAITING_HUMAN',
        'COMPLETED',
        'FAILED',
        'CANCELLED',
        'STOPPED',
        'EXPIRED',
    ]),
    WAITING: new Set(['RUNNING', 'PAUSED', 'BLOCKED', 'CANCELLED', 'STOPPED', 'FAILED', 'EXPIRED']),
    PAUSED: new Set(['READY', 'RUNNING', 'CANCELLED', 'STOPPED']),
    BLOCKED: new Set(['READY', 'RUNNING', 'AWAITING_HUMAN', 'CANCELLED', 'STOPPED', 'FAILED']),
    RECOVERING: new Set(['RUNNING', 'READY', 'BLOCKED', 'AWAITING_HUMAN', 'FAILED', 'CANCELLED', 'STOPPED']),
    AWAITING_HUMAN: new Set(['RUNNING', 'READY', 'BLOCKED', 'COMPLETED', 'CANCELLED', 'STOPPED', 'FAILED']),
    COMPLETED: new Set([]), // Terminal
    FAILED: new Set([]), // Terminal
    CANCELLED: new Set([]), // Terminal
    STOPPED: new Set([]), // Terminal
    EXPIRED: new Set([]), // Terminal
};
/**
 * Valid transitions for ExecutiveTask states (12 states).
 */
const VALID_TASK_TRANSITIONS = {
    PENDING: new Set(['READY', 'BLOCKED', 'AWAITING_HUMAN', 'WAITING_FOR_CHILDREN', 'CANCELLED', 'SKIPPED']),
    READY: new Set(['RUNNING', 'AWAITING_HUMAN', 'BLOCKED', 'WAITING_FOR_CHILDREN', 'CANCELLED', 'SKIPPED']),
    RUNNING: new Set([
        'EXECUTED',
        'VERIFIED',
        'COMPLETED',
        'FAILED',
        'RECOVERING',
        'BLOCKED',
        'WAITING_FOR_CHILDREN',
        'AWAITING_HUMAN',
        'CANCELLED',
        'SKIPPED',
    ]),
    WAITING_FOR_CHILDREN: new Set(['COMPLETED', 'FAILED', 'CANCELLED', 'READY']),
    AWAITING_HUMAN: new Set(['READY', 'RUNNING', 'BLOCKED', 'CANCELLED']),
    EXECUTED: new Set(['VERIFIED', 'COMPLETED', 'FAILED', 'RECOVERING']),
    VERIFIED: new Set(['COMPLETED', 'FAILED']),
    COMPLETED: new Set([]), // Terminal
    FAILED: new Set(['RECOVERING', 'READY', 'CANCELLED']), // Can transition to RECOVERING
    RECOVERING: new Set(['READY', 'RUNNING', 'FAILED', 'BLOCKED', 'CANCELLED']),
    BLOCKED: new Set(['READY', 'PENDING', 'AWAITING_HUMAN', 'CANCELLED', 'FAILED']),
    CANCELLED: new Set([]), // Terminal
    SKIPPED: new Set([]), // Terminal
};
export function isValidGoalTransition(from, to) {
    if (from === to)
        return true;
    const allowed = VALID_GOAL_TRANSITIONS[from];
    return allowed ? allowed.has(to) : false;
}
export const canTransitionGoal = isValidGoalTransition;
export function assertValidGoalTransition(from, to, context) {
    if (!isValidGoalTransition(from, to)) {
        throw new ExecutiveTransitionError('GOAL', from, to, context);
    }
}
export function isValidTaskTransition(from, to) {
    if (from === to)
        return true;
    const allowed = VALID_TASK_TRANSITIONS[from];
    return allowed ? allowed.has(to) : false;
}
export const canTransitionTask = isValidTaskTransition;
export function assertValidTaskTransition(from, to, context) {
    if (!isValidTaskTransition(from, to)) {
        throw new ExecutiveTransitionError('TASK', from, to, context);
    }
}
