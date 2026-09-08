/**
 * Every valid state the Internet Edge connection lifecycle can occupy.
 *
 * INVARIANT: INTERNET_CLOSED and INTERNET_REJECTED are terminal — no outgoing transitions.
 * INVARIANT: INTERNET_ADMITTED is the prerequisite gate before relay fabric binding.
 */
export type InternetEdgeState = 'INTERNET_OFFLINE' | 'INTERNET_RESOLVING' | 'INTERNET_CONNECTING' | 'INTERNET_TLS_HANDSHAKING' | 'INTERNET_CERT_VALIDATING' | 'INTERNET_ADMITTED' | 'INTERNET_RELAY_BINDING' | 'INTERNET_ACTIVE' | 'INTERNET_DEGRADED' | 'INTERNET_ROAMING' | 'INTERNET_RECONNECTING' | 'INTERNET_DRAINING' | 'INTERNET_CLOSED' | 'INTERNET_REJECTED';
/** States where the edge may carry user-plane traffic. */
export declare const INTERNET_TRANSMIT_STATES: readonly InternetEdgeState[];
/** Terminal states — no further transitions are legal. */
export declare const INTERNET_TERMINAL_STATES: readonly InternetEdgeState[];
/** States that indicate an in-progress recovery attempt. */
export declare const INTERNET_RECOVERY_STATES: readonly InternetEdgeState[];
/** All valid Internet Edge states for exhaustive testing. */
export declare const ALL_INTERNET_STATES: readonly InternetEdgeState[];
export declare function isInternetActive(state: InternetEdgeState): boolean;
export declare function isInternetTerminal(state: InternetEdgeState): boolean;
export declare function isInternetRecovering(state: InternetEdgeState): boolean;
export declare function canInternetTransmit(state: InternetEdgeState): boolean;
