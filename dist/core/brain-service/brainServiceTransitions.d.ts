import type { BrainServiceLifecycleState } from './brainServiceStates.js';
export declare const VALID_SERVICE_TRANSITIONS: Readonly<Record<BrainServiceLifecycleState, readonly BrainServiceLifecycleState[]>>;
export declare function isValidServiceTransition(from: BrainServiceLifecycleState, to: BrainServiceLifecycleState): boolean;
export declare function assertValidServiceTransition(from: BrainServiceLifecycleState, to: BrainServiceLifecycleState): void;
