// src/core/world-action/worldActionStates.ts
// BOWCON V4.0 — MS-1.3.33: REAL BOWCON WORLD ACTION & GOVERNED EXECUTION RUNTIME
//
// Lifecycle state definitions, state queries, and invariants for governed physical host actions.

import type { ActionLifecycleState, ActionAuthorizationState, ActionExecutionState, ActionVerificationState } from './worldActionTypes.js';

export const TERMINAL_ACTION_STATES: ReadonlySet<ActionLifecycleState> = new Set([
  'COMMITTED',
  'DENIED',
  'FAILED',
  'ROLLED_BACK',
  'CANCELLED',
]);

export function isActionTerminal(state: ActionLifecycleState): boolean {
  return TERMINAL_ACTION_STATES.has(state);
}

export function isActionActive(state: ActionLifecycleState): boolean {
  return !TERMINAL_ACTION_STATES.has(state);
}

export function canActionPrepare(state: ActionLifecycleState): boolean {
  return state === 'REQUESTED' || state === 'UNDERSTOOD';
}

export function canActionAuthorize(state: ActionLifecycleState): boolean {
  return state === 'PLANNED' || state === 'AUTHORIZATION_REQUIRED' || state === 'AWAITING_CONFIRMATION';
}

export function canActionExecute(
  lifecycleState: ActionLifecycleState,
  authState: ActionAuthorizationState,
  execState: ActionExecutionState
): boolean {
  if (lifecycleState !== 'AUTHORIZED') return false;
  if (authState !== 'AUTHORIZED' && authState !== 'NOT_REQUIRED') return false;
  if (execState !== 'PREPARED') return false;
  return true;
}

export function canActionVerify(
  lifecycleState: ActionLifecycleState,
  execState: ActionExecutionState
): boolean {
  return lifecycleState === 'EXECUTING' && execState === 'EXECUTED';
}

export function canActionCommit(
  lifecycleState: ActionLifecycleState,
  verifState: ActionVerificationState
): boolean {
  return lifecycleState === 'VERIFYING' && verifState === 'VERIFIED';
}
