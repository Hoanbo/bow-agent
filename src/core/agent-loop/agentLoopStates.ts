// src/core/agent-loop/agentLoopStates.ts
// BOWCON V4.0 — MS-1.3.36: REAL BOWCON CONTINUOUS AGENT OPERATING LOOP & CONTROLLED AUTONOMY RUNTIME
//
// 19-State Machine Taxonomy and Predicate Functions.

import type { AgentLoopState } from './agentLoopTypes.js';

export function isLoopTerminalState(state: AgentLoopState): boolean {
  return state === 'STOPPED' || state === 'FAILED';
}

export function isLoopExecutionState(state: AgentLoopState): boolean {
  return state === 'EXECUTING' || state === 'VERIFYING';
}

export function isLoopWaitingForHuman(state: AgentLoopState): boolean {
  return state === 'WAITING_FOR_AUTHORIZATION';
}

export function isLoopStopped(state: AgentLoopState): boolean {
  return state === 'STOPPING' || state === 'STOPPED';
}

export function isLoopPaused(state: AgentLoopState): boolean {
  return state === 'PAUSED';
}

export function isLoopRecovering(state: AgentLoopState): boolean {
  return state === 'RECOVERING' || state === 'ESCALATING';
}

export function isLoopOperationalState(state: AgentLoopState): boolean {
  return (
    state === 'READY' ||
    state === 'OBSERVING' ||
    state === 'STATE_RECONSTRUCTION' ||
    state === 'REASONING' ||
    state === 'PLANNING' ||
    state === 'GOVERNANCE_CHECK' ||
    state === 'WAITING_FOR_AUTHORIZATION' ||
    state === 'AUTHORIZED' ||
    state === 'EXECUTING' ||
    state === 'VERIFYING' ||
    state === 'EVALUATING'
  );
}

// Non-colliding ergonomic aliases
export const isLoopExecution = isLoopExecutionState;
export const isLoopWaiting = isLoopWaitingForHuman;
