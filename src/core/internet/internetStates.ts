// src/core/internet/internetStates.ts
// BOWCON V4.0 — PRODUCTION SECURE INTERNET EDGE & TLS RELAY RUNTIME (MS-1.3.29)
//
// Finite state taxonomy for the Internet Edge lifecycle.
// States are fail-closed: any undefined transition defaults to INTERNET_CLOSED.

/**
 * Every valid state the Internet Edge connection lifecycle can occupy.
 *
 * INVARIANT: INTERNET_CLOSED and INTERNET_REJECTED are terminal — no outgoing transitions.
 * INVARIANT: INTERNET_ADMITTED is the prerequisite gate before relay fabric binding.
 */
export type InternetEdgeState =
  | 'INTERNET_OFFLINE'         // No network — initial state
  | 'INTERNET_RESOLVING'       // DNS / endpoint resolution underway
  | 'INTERNET_CONNECTING'      // TCP handshake in progress
  | 'INTERNET_TLS_HANDSHAKING' // TLS ClientHello → ServerHello in flight
  | 'INTERNET_CERT_VALIDATING' // Certificate chain and pin verification
  | 'INTERNET_ADMITTED'        // TLS + cert valid; ready for relay binding
  | 'INTERNET_RELAY_BINDING'   // Binding through admission bridge to relay fabric
  | 'INTERNET_ACTIVE'          // Fully active — frames flowing
  | 'INTERNET_DEGRADED'        // Active but latency / loss elevated
  | 'INTERNET_ROAMING'         // Network interface / IP change detected
  | 'INTERNET_RECONNECTING'    // Attempting reconnect after disconnect
  | 'INTERNET_DRAINING'        // Graceful drain before close
  | 'INTERNET_CLOSED'          // Terminal — clean shutdown
  | 'INTERNET_REJECTED';       // Terminal — security policy violation

/** States where the edge may carry user-plane traffic. */
export const INTERNET_TRANSMIT_STATES: readonly InternetEdgeState[] = Object.freeze([
  'INTERNET_ACTIVE',
  'INTERNET_DEGRADED',
]);

/** Terminal states — no further transitions are legal. */
export const INTERNET_TERMINAL_STATES: readonly InternetEdgeState[] = Object.freeze([
  'INTERNET_CLOSED',
  'INTERNET_REJECTED',
]);

/** States that indicate an in-progress recovery attempt. */
export const INTERNET_RECOVERY_STATES: readonly InternetEdgeState[] = Object.freeze([
  'INTERNET_RECONNECTING',
  'INTERNET_ROAMING',
]);

/** All valid Internet Edge states for exhaustive testing. */
export const ALL_INTERNET_STATES: readonly InternetEdgeState[] = Object.freeze([
  'INTERNET_OFFLINE',
  'INTERNET_RESOLVING',
  'INTERNET_CONNECTING',
  'INTERNET_TLS_HANDSHAKING',
  'INTERNET_CERT_VALIDATING',
  'INTERNET_ADMITTED',
  'INTERNET_RELAY_BINDING',
  'INTERNET_ACTIVE',
  'INTERNET_DEGRADED',
  'INTERNET_ROAMING',
  'INTERNET_RECONNECTING',
  'INTERNET_DRAINING',
  'INTERNET_CLOSED',
  'INTERNET_REJECTED',
]);

export function isInternetActive(state: InternetEdgeState): boolean {
  return (INTERNET_TRANSMIT_STATES as readonly string[]).includes(state);
}

export function isInternetTerminal(state: InternetEdgeState): boolean {
  return (INTERNET_TERMINAL_STATES as readonly string[]).includes(state);
}

export function isInternetRecovering(state: InternetEdgeState): boolean {
  return (INTERNET_RECOVERY_STATES as readonly string[]).includes(state);
}

export function canInternetTransmit(state: InternetEdgeState): boolean {
  return isInternetActive(state);
}
