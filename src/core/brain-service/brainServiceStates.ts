// src/core/brain-service/brainServiceStates.ts
// BOWCON V4.0 — MS-1.3.31: REAL BOWCON BRAIN SERVICE & CONTINUOUS RUNTIME
//
// 16 Authoritative Lifecycle States for BrainService.
// Fail-closed design ensures no undefined runtime state transitions.

export type BrainServiceLifecycleState =
  | 'CREATED'
  | 'INITIALIZING'
  | 'LOADING_STATE'
  | 'READY'
  | 'RECEIVING'
  | 'PROCESSING'
  | 'PLANNING'
  | 'EXECUTING'
  | 'VERIFYING'
  | 'COMMITTING'
  | 'RESPONDING'
  | 'DEGRADED'
  | 'RECOVERING'
  | 'SHUTTING_DOWN'
  | 'STOPPED'
  | 'FAILED';

export const ALL_BRAIN_SERVICE_STATES: readonly BrainServiceLifecycleState[] = Object.freeze([
  'CREATED',
  'INITIALIZING',
  'LOADING_STATE',
  'READY',
  'RECEIVING',
  'PROCESSING',
  'PLANNING',
  'EXECUTING',
  'VERIFYING',
  'COMMITTING',
  'RESPONDING',
  'DEGRADED',
  'RECOVERING',
  'SHUTTING_DOWN',
  'STOPPED',
  'FAILED',
]);

export const BRAIN_SERVICE_TERMINAL_STATES: readonly BrainServiceLifecycleState[] = Object.freeze([
  'STOPPED',
]);

export const BRAIN_SERVICE_ACCEPTING_STATES: readonly BrainServiceLifecycleState[] = Object.freeze([
  'READY',
  'DEGRADED',
]);

export const BRAIN_SERVICE_PROCESSING_STATES: readonly BrainServiceLifecycleState[] = Object.freeze([
  'RECEIVING',
  'PROCESSING',
  'PLANNING',
  'EXECUTING',
  'VERIFYING',
  'COMMITTING',
  'RESPONDING',
]);

export function isServiceTerminal(state: BrainServiceLifecycleState): boolean {
  return (BRAIN_SERVICE_TERMINAL_STATES as readonly string[]).includes(state);
}

export function canServiceAcceptRequest(state: BrainServiceLifecycleState): boolean {
  return (BRAIN_SERVICE_ACCEPTING_STATES as readonly string[]).includes(state);
}

export function isServiceProcessing(state: BrainServiceLifecycleState): boolean {
  return (BRAIN_SERVICE_PROCESSING_STATES as readonly string[]).includes(state);
}

export function isServiceReady(state: BrainServiceLifecycleState): boolean {
  return state === 'READY';
}
