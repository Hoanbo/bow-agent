import type { WireConnectionState } from './wireStates.js';
export declare const WIRE_TRANSITIONS: Readonly<Record<WireConnectionState, readonly WireConnectionState[]>>;
/**
 * Checks whether transitioning from `from` to `to` is legally permitted.
 */
export declare function isValidWireTransition(from: WireConnectionState, to: WireConnectionState): boolean;
/**
 * Asserts that transitioning from `from` to `to` is legally permitted.
 * Throws a typed WireTransportError if transition is illegal.
 */
export declare function assertValidWireTransition(from: WireConnectionState, to: WireConnectionState, context?: string): void;
