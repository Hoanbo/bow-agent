import type { InternetEdgeState } from './internetStates.js';
/**
 * Explicit, exhaustive transition matrix.
 * Keys are source states; values are the set of legal destination states.
 *
 * INVARIANT: Terminal states (CLOSED, REJECTED) have empty target sets.
 * INVARIANT: INTERNET_REJECTED is reachable from all non-terminal states.
 */
export declare const INTERNET_TRANSITIONS: Readonly<Record<InternetEdgeState, readonly InternetEdgeState[]>>;
/**
 * Returns true if transitioning from → to is a permitted step.
 * Self-transitions (from === to) are always allowed.
 */
export declare function isValidInternetTransition(from: InternetEdgeState, to: InternetEdgeState): boolean;
/**
 * Asserts that from → to is a legal transition.
 * Throws InternetEdgeError (code INTERNET_ILLEGAL_TRANSITION) on violation.
 */
export declare function assertValidInternetTransition(from: InternetEdgeState, to: InternetEdgeState, context?: string): void;
