// src/core/brain/brainTransitions.ts
// BOWCON V4.0 — MS-1.3.30: BRAIN STATE TRANSITION MATRIX
//
// Fail-closed transition matrix for the Brain lifecycle state machine.
// Illegal transitions are rejected with a BrainError.
// Every transition is auditable.

import type { BrainLifecycleState } from './brainStates.js';
import { BrainError } from './brainFailure.js';

/**
 * Authoritative transition table.
 * Key = from state. Value = set of legal `to` states.
 * Self-transitions are always allowed (idempotent).
 */
export const BRAIN_TRANSITIONS: Readonly<Record<BrainLifecycleState, readonly BrainLifecycleState[]>> = Object.freeze({
  IDLE: ['INPUT_RECEIVED', 'STOPPED', 'PAUSED'],
  INPUT_RECEIVED: ['UNDERSTANDING', 'FAILED', 'STOPPED'],
  UNDERSTANDING: ['REASONING', 'FAILED', 'STOPPED', 'PAUSED'],
  REASONING: ['PLANNING', 'FAILED', 'STOPPED', 'PAUSED'],
  PLANNING: ['DECIDING', 'RECOVERING', 'FAILED', 'STOPPED', 'PAUSED'],
  DECIDING: ['ACTION_PREPARING', 'RECOVERING', 'FAILED', 'STOPPED', 'PAUSED'],
  ACTION_PREPARING: ['EXECUTING', 'FAILED', 'STOPPED', 'PAUSED'],
  EXECUTING: ['OBSERVING', 'RECOVERING', 'FAILED', 'STOPPED', 'PAUSED'],
  OBSERVING: ['VERIFYING', 'RECOVERING', 'FAILED', 'STOPPED', 'PAUSED'],
  VERIFYING: ['COMMITTING', 'RECOVERING', 'FAILED', 'STOPPED', 'PAUSED'],
  COMMITTING: ['COMPLETED', 'FAILED', 'STOPPED'],
  COMPLETED: ['IDLE', 'INPUT_RECEIVED', 'STOPPED'],
  RECOVERING: ['REPLANNING', 'FAILED', 'STOPPED', 'PAUSED'],
  REPLANNING: ['PLANNING', 'DECIDING', 'FAILED', 'STOPPED', 'PAUSED'],
  FAILED: ['IDLE', 'STOPPED'],
  PAUSED: ['IDLE', 'INPUT_RECEIVED', 'UNDERSTANDING', 'REASONING', 'PLANNING',
    'DECIDING', 'ACTION_PREPARING', 'EXECUTING', 'RECOVERING', 'STOPPED'],
  STOPPED: [], // terminal — no further transitions
});

export function isValidBrainTransition(
  from: BrainLifecycleState,
  to: BrainLifecycleState
): boolean {
  if (from === to) return true; // self-transition always idempotent
  const allowed = BRAIN_TRANSITIONS[from];
  return allowed ? (allowed as string[]).includes(to) : false;
}

export function assertValidBrainTransition(
  from: BrainLifecycleState,
  to: BrainLifecycleState
): void {
  if (!isValidBrainTransition(from, to)) {
    throw new BrainError(
      'BRAIN_ILLEGAL_TRANSITION',
      `Brain state transition from "${from}" to "${to}" is not allowed.`
    );
  }
}
