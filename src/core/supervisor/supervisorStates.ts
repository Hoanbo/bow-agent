// src/core/supervisor/supervisorStates.ts
// BOWCON V4.0 — MS-1.3.35: REAL BOWCON SUPERVISORY AUTONOMOUS RECOVERY & HUMAN GOVERNANCE RUNTIME
//
// 16-State Supervisory Lifecycle State Machine Taxonomy and Predicates.

import type { SupervisorRuntimeState } from './supervisorTypes.js';

export function isSupervisorOperationalState(state: SupervisorRuntimeState): boolean {
  return state === 'HEALTHY' || state === 'OBSERVING';
}

export function isRecoveryActive(state: SupervisorRuntimeState): boolean {
  return state === 'RECOVERING' || state === 'VERIFYING';
}

export function isWaitingForHuman(state: SupervisorRuntimeState): boolean {
  return state === 'WAITING_FOR_HUMAN';
}

export function isSafeStop(state: SupervisorRuntimeState): boolean {
  return state === 'SAFE_STOP';
}

export function canInitiateRecovery(state: SupervisorRuntimeState): boolean {
  return state === 'AUTHORIZED' || state === 'POLICY_EVALUATION';
}
