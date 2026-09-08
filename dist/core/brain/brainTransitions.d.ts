import type { BrainLifecycleState } from './brainStates.js';
/**
 * Authoritative transition table.
 * Key = from state. Value = set of legal `to` states.
 * Self-transitions are always allowed (idempotent).
 */
export declare const BRAIN_TRANSITIONS: Readonly<Record<BrainLifecycleState, readonly BrainLifecycleState[]>>;
export declare function isValidBrainTransition(from: BrainLifecycleState, to: BrainLifecycleState): boolean;
export declare function assertValidBrainTransition(from: BrainLifecycleState, to: BrainLifecycleState): void;
