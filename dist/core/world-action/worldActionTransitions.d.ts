import type { ActionLifecycleState } from './worldActionTypes.js';
export declare const VALID_ACTION_TRANSITIONS: Readonly<Record<ActionLifecycleState, readonly ActionLifecycleState[]>>;
export declare function isValidActionTransition(from: ActionLifecycleState, to: ActionLifecycleState): boolean;
export declare function assertValidActionTransition(from: ActionLifecycleState, to: ActionLifecycleState, actionId?: string): void;
