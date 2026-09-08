// src/core/brain/brainStates.ts
// BOWCON V4.0 — MS-1.3.30: BRAIN RUNTIME STATE TAXONOMY
//
// Defines the 17-state Brain lifecycle state machine.
// Brain state is INDEPENDENT from:
//   - task state     (BrainTaskStatus)
//   - session state  (SessionMemoryState)
//   - device state   (PersistentDeviceTrustRecord)
//   - relay state    (RelayRuntimeSnapshot)

export type BrainLifecycleState =
  | 'IDLE'
  | 'INPUT_RECEIVED'
  | 'UNDERSTANDING'
  | 'REASONING'
  | 'PLANNING'
  | 'DECIDING'
  | 'ACTION_PREPARING'
  | 'EXECUTING'
  | 'OBSERVING'
  | 'VERIFYING'
  | 'COMMITTING'
  | 'COMPLETED'
  | 'RECOVERING'
  | 'REPLANNING'
  | 'FAILED'
  | 'PAUSED'
  | 'STOPPED';

export const ALL_BRAIN_STATES: readonly BrainLifecycleState[] = Object.freeze([
  'IDLE',
  'INPUT_RECEIVED',
  'UNDERSTANDING',
  'REASONING',
  'PLANNING',
  'DECIDING',
  'ACTION_PREPARING',
  'EXECUTING',
  'OBSERVING',
  'VERIFYING',
  'COMMITTING',
  'COMPLETED',
  'RECOVERING',
  'REPLANNING',
  'FAILED',
  'PAUSED',
  'STOPPED',
]);

export const BRAIN_TERMINAL_STATES: readonly BrainLifecycleState[] = Object.freeze([
  'STOPPED',
]);

export const BRAIN_RESTING_STATES: readonly BrainLifecycleState[] = Object.freeze([
  'IDLE', 'COMPLETED', 'FAILED', 'PAUSED',
]);

export const BRAIN_ACTIVE_EXECUTION_STATES: readonly BrainLifecycleState[] = Object.freeze([
  'UNDERSTANDING', 'REASONING', 'PLANNING', 'DECIDING',
  'ACTION_PREPARING', 'EXECUTING', 'OBSERVING', 'VERIFYING',
  'COMMITTING',
]);

export function isBrainTerminal(state: BrainLifecycleState): boolean {
  return (BRAIN_TERMINAL_STATES as string[]).includes(state);
}

export function isBrainResting(state: BrainLifecycleState): boolean {
  return (BRAIN_RESTING_STATES as string[]).includes(state);
}

export function isBrainActivelyExecuting(state: BrainLifecycleState): boolean {
  return (BRAIN_ACTIVE_EXECUTION_STATES as string[]).includes(state);
}

export function canBrainAcceptInput(state: BrainLifecycleState): boolean {
  return state === 'IDLE' || state === 'COMPLETED' || state === 'FAILED';
}
