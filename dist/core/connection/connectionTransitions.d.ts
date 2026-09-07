import type { ConnectionState, SessionState } from './connectionStates.js';
export declare const CONNECTION_TRANSITION_MATRIX: Readonly<Record<ConnectionState, readonly ConnectionState[]>>;
export declare const SESSION_TRANSITION_MATRIX: Readonly<Record<SessionState, readonly SessionState[]>>;
/**
 * Validates whether a connection transition from -> to is permissible.
 */
export declare function isValidConnectionStateTransition(from: ConnectionState, to: ConnectionState): boolean;
/**
 * Asserts valid connection transition, failing closed on violation.
 */
export declare function assertValidConnectionStateTransition(from: ConnectionState, to: ConnectionState): void;
/**
 * Validates whether a session transition from -> to is permissible.
 */
export declare function isValidSessionTransition(from: SessionState, to: SessionState): boolean;
/**
 * Asserts valid session transition, failing closed on violation.
 */
export declare function assertValidSessionTransition(from: SessionState, to: SessionState): void;
