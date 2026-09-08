import type { RelaySessionState } from './relayTypes.js';
export declare class RelayTransitionError extends Error {
    readonly fromState: RelaySessionState;
    readonly toState: RelaySessionState;
    constructor(fromState: RelaySessionState, toState: RelaySessionState, message?: string);
}
export declare const RELAY_TRANSITIONS: Readonly<Record<RelaySessionState, readonly RelaySessionState[]>>;
/**
 * Checks if a transition between two states is valid under the fail-closed matrix.
 */
export declare function canTransitionRelaySession(fromState: RelaySessionState, toState: RelaySessionState): boolean;
/**
 * Asserts that a transition is valid, throwing a RelayTransitionError if invalid.
 */
export declare function assertValidRelayTransition(fromState: RelaySessionState, toState: RelaySessionState): void;
