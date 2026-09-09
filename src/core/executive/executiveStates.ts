// src/core/executive/executiveStates.ts
// BOWCON V4.0 — MS-1.3.37: REAL BOWCON EXECUTIVE TASK & LONG-HORIZON GOAL ORCHESTRATION RUNTIME
//
// State predicates and categorization for Executive Goals and Tasks.

import type { GoalStatus, TaskStatus } from './executiveTypes.js';

export const TERMINAL_GOAL_STATES: ReadonlySet<GoalStatus> = new Set<GoalStatus>([
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'STOPPED',
  'EXPIRED',
]);

export const ACTIVE_GOAL_STATES: ReadonlySet<GoalStatus> = new Set<GoalStatus>([
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

export const TERMINAL_TASK_STATES: ReadonlySet<TaskStatus> = new Set<TaskStatus>([
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'SKIPPED',
]);

export function isGoalTerminal(status: GoalStatus): boolean {
  return TERMINAL_GOAL_STATES.has(status);
}

export function isGoalActive(status: GoalStatus): boolean {
  return ACTIVE_GOAL_STATES.has(status);
}

export function isGoalPaused(status: GoalStatus): boolean {
  return status === 'PAUSED';
}

export function isGoalStopped(status: GoalStatus): boolean {
  return status === 'STOPPED';
}

export function isTaskTerminal(status: TaskStatus): boolean {
  return TERMINAL_TASK_STATES.has(status);
}

export function isTaskExecutable(status: TaskStatus): boolean {
  return status === 'READY';
}

export function isTaskBlocked(status: TaskStatus): boolean {
  return status === 'BLOCKED';
}
