import type { RelaySessionState } from './relayTypes.js';
export declare const ALL_RELAY_SESSION_STATES: readonly RelaySessionState[];
/**
 * Returns true if the state is terminal (no further transitions permitted).
 */
export declare function isTerminalRelayState(state: RelaySessionState): boolean;
/**
 * Returns true if the session is actively transmitting or capable of routing messages.
 */
export declare function isActiveRelaySession(state: RelaySessionState): boolean;
/**
 * Returns true if the state is considered degraded or temporarily suspended but recoverable.
 */
export declare function isRecoverableRelayState(state: RelaySessionState): boolean;
/**
 * Returns true if the state requires zero-trust admission validation.
 */
export declare function requiresAdmissionCheck(state: RelaySessionState): boolean;
/**
 * Returns true if payload messages (REQUEST, EVENT, RESPONSE) can be forwarded.
 */
export declare function canTransmitPayload(state: RelaySessionState): boolean;
/**
 * Returns true if in connection establishment or reconnection phase.
 */
export declare function isConnectingOrResuming(state: RelaySessionState): boolean;
