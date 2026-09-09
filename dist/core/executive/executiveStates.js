// src/core/executive/executiveStates.ts
// BOWCON V4.0 — MS-1.3.37: REAL BOWCON EXECUTIVE TASK & LONG-HORIZON GOAL ORCHESTRATION RUNTIME
//
// State predicates and categorization for Executive Goals and Tasks.
export const TERMINAL_GOAL_STATES = new Set([
    'COMPLETED',
    'FAILED',
    'CANCELLED',
    'STOPPED',
    'EXPIRED',
]);
export const ACTIVE_GOAL_STATES = new Set([
    'CREATED',
    'INTERPRETING',
    'INTERPRETED',
    'DECOMPOSING',
    'DECOMPOSED',
    'PLANNING',
    'READY',
    'RUNNING',
    'WAITING',
    'RECOVERING',
    'AWAITING_HUMAN',
]);
export const TERMINAL_TASK_STATES = new Set([
    'COMPLETED',
    'FAILED',
    'CANCELLED',
    'SKIPPED',
]);
export function isGoalTerminal(status) {
    return TERMINAL_GOAL_STATES.has(status);
}
export function isGoalActive(status) {
    return ACTIVE_GOAL_STATES.has(status);
}
export function isGoalPaused(status) {
    return status === 'PAUSED';
}
export function isGoalStopped(status) {
    return status === 'STOPPED';
}
export function isTaskTerminal(status) {
    return TERMINAL_TASK_STATES.has(status);
}
export function isTaskExecutable(status) {
    return status === 'READY';
}
export function isTaskBlocked(status) {
    return status === 'BLOCKED';
}
