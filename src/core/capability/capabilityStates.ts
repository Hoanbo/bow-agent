// src/core/capability/capabilityStates.ts
// BOWCON V4.0 — MS-1.3.34: REAL BOWCON CAPABILITY & ENVIRONMENT INTERACTION RUNTIME
//
// State taxonomy and predicates for real capability availability.

import type { CapabilityState } from './capabilityTypes.js';

export function isCapabilityExecutable(state: CapabilityState): boolean {
  return state === 'AVAILABLE' || state === 'DEGRADED' || state === 'REQUIRES_AUTHORIZATION';
}

export function isCapabilityAvailable(state: CapabilityState): boolean {
  return state === 'AVAILABLE';
}

export function requiresHumanGate(state: CapabilityState): boolean {
  return state === 'REQUIRES_AUTHORIZATION' || state === 'REQUIRES_APPROVAL';
}

export function isCapabilityOperational(state: CapabilityState): boolean {
  return state !== 'FAILED' && state !== 'DISABLED' && state !== 'UNSUPPORTED';
}
