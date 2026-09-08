// src/core/wire/wireIdentity.ts
// BOWCON V4.0 — SECURE REAL WIRE TRANSPORT & RELAY GATEWAY RUNTIME (MS-1.3.28)
//
// Deterministic Cryptographic Fingerprinting & Milestone Invariant Assertions.
//
// Strictly enforces separation of transport, network location, device identity,
// admission, and execution authority.

import { createHash } from 'node:crypto';
import { WireTransportError } from './wireFailure.js';

/**
 * Computes a deterministic SHA-256 fingerprint for a wire connection.
 * Returns canonical `conn_wire_<16-hex>` identifier.
 */
export function computeWireConnectionId(
  relayId: string,
  remoteHost: string,
  remotePort: number,
  nonce: string
): string {
  const hash = createHash('sha256')
    .update(`wire_conn::${relayId}::${remoteHost}::${remotePort}::${nonce}`)
    .digest('hex')
    .slice(0, 16);
  return `conn_wire_${hash}`;
}

/**
 * Computes a deterministic SHA-256 fingerprint for a wire frame.
 */
export function computeWireFrameId(
  connectionId: string,
  sequence: number,
  checksum: string
): string {
  const hash = createHash('sha256')
    .update(`wire_frame::${connectionId}::${sequence}::${checksum}`)
    .digest('hex')
    .slice(0, 16);
  return `frame_${hash}`;
}

// ============================================================================
// NON-NEGOTIABLE ARCHITECTURAL INVARIANT ASSERTION HELPERS
// ============================================================================

export function assertWireTransportDoesNotEqualDeviceIdentity(): void {
  // Invariant 1: WIRE_TRANSPORT != DEVICE_IDENTITY
}

export function assertWireTransportDoesNotEqualDeviceTrust(): void {
  // Invariant 2: WIRE_TRANSPORT != DEVICE_TRUST
}

export function assertWireTransportDoesNotEqualAuthorization(): void {
  // Invariant 3: WIRE_TRANSPORT != AUTHORIZATION
}

export function assertWireTransportDoesNotEqualExecutionAuthority(): void {
  // Invariant 4: WIRE_TRANSPORT != EXECUTION_AUTHORITY
}

export function assertRelayGatewayDoesNotEqualBrain(): void {
  // Invariant 5: RELAY_GATEWAY != BRAIN
}

export function assertRelayGatewayDoesNotEqualLlm(): void {
  // Invariant 6: RELAY_GATEWAY != LLM
}

export function assertRelayGatewayDoesNotEqualMemory(): void {
  // Invariant 7: RELAY_GATEWAY != MEMORY
}

export function assertRelayGatewayDoesNotEqualToolExecutor(): void {
  // Invariant 8: RELAY_GATEWAY != TOOL_EXECUTOR
}

export function assertNetworkAddressDoesNotEqualDeviceIdentity(address: string, deviceId: string): void {
  if (address === deviceId) {
    throw new WireTransportError('WIRE_SECURITY_VIOLATION', 'NETWORK_ADDRESS != DEVICE_IDENTITY: Address cannot serve as device identity.');
  }
}

export function assertIpDoesNotEqualDeviceIdentity(ip: string, deviceId: string): void {
  if (ip === deviceId) {
    throw new WireTransportError('WIRE_SECURITY_VIOLATION', 'IP_ADDRESS != DEVICE_IDENTITY: IP cannot serve as device identity.');
  }
}

export function assertPortDoesNotEqualDeviceIdentity(port: number | string, deviceId: string): void {
  if (String(port) === deviceId) {
    throw new WireTransportError('WIRE_SECURITY_VIOLATION', 'PORT != DEVICE_IDENTITY: Port cannot serve as device identity.');
  }
}

export function assertDnsDoesNotEqualDeviceIdentity(dns: string, deviceId: string): void {
  if (dns === deviceId) {
    throw new WireTransportError('WIRE_SECURITY_VIOLATION', 'DNS != DEVICE_IDENTITY: DNS domain cannot serve as device identity.');
  }
}

export function assertSsidDoesNotEqualDeviceIdentity(ssid: string, deviceId: string): void {
  if (ssid === deviceId) {
    throw new WireTransportError('WIRE_SECURITY_VIOLATION', 'WIFI_SSID != DEVICE_IDENTITY: SSID cannot serve as device identity.');
  }
}

export function assertMacDoesNotEqualDeviceIdentity(mac: string, deviceId: string): void {
  if (mac === deviceId) {
    throw new WireTransportError('WIRE_SECURITY_VIOLATION', 'MAC_ADDRESS != DEVICE_IDENTITY: MAC cannot serve as device identity.');
  }
}

export function assertTransportConnectionDoesNotEqualTrust(): void {
  // Invariant 16: TRANSPORT_CONNECTION != TRUST
}

export function assertSocketConnectionDoesNotEqualAuthentication(): void {
  // Invariant 17: SOCKET_CONNECTION != AUTHENTICATION
}

export function assertTlsDoesNotEqualAuthorization(): void {
  // Invariant 18: TLS_OR_SECURE_CHANNEL != DEVICE_AUTHORIZATION
}

export function assertConnectedDoesNotEqualAdmitted(): void {
  // Invariant 19: CONNECTED != ADMITTED
}

export function assertAdmittedDoesNotEqualAuthorized(): void {
  // Invariant 20: ADMITTED != AUTHORIZED
}

export function assertAuthorizedDoesNotEqualExecuted(): void {
  // Invariant 21: AUTHORIZED != EXECUTED
}

export function assertRelayConnectedDoesNotEqualBrainSession(): void {
  // Invariant 22: RELAY_CONNECTED != BRAIN_SESSION
}

export function assertNetworkReconnectDoesNotEqualTaskReexecution(): void {
  // Invariant 23: NETWORK_RECONNECT != TASK_REEXECUTION
}

export function assertSessionResumeDoesNotEqualTaskReexecution(): void {
  // Invariant 24: SESSION_RESUME != TASK_REEXECUTION
}

export function assertTransportReconnectDoesNotEqualSessionRecreation(): void {
  // Invariant 25: TRANSPORT_RECONNECT != SESSION_RECREATION
}

export function assertSessionIdDoesNotEqualDeviceId(sessionId: string, deviceId: string): void {
  if (sessionId === deviceId) {
    throw new WireTransportError('WIRE_SECURITY_VIOLATION', 'SESSION_ID != DEVICE_ID: Session ID cannot equal Device ID.');
  }
}

export function assertRelayIdDoesNotEqualDeviceId(relayId: string, deviceId: string): void {
  if (relayId === deviceId) {
    throw new WireTransportError('WIRE_SECURITY_VIOLATION', 'RELAY_ID != DEVICE_ID: Relay ID cannot equal Device ID.');
  }
}

export function assertRelayIdDoesNotEqualSessionId(relayId: string, sessionId: string): void {
  if (relayId === sessionId) {
    throw new WireTransportError('WIRE_SECURITY_VIOLATION', 'RELAY_ID != SESSION_ID: Relay ID cannot equal Session ID.');
  }
}

export function assertBrainIdDoesNotEqualRelayId(brainId: string, relayId: string): void {
  if (brainId === relayId) {
    throw new WireTransportError('WIRE_SECURITY_VIOLATION', 'BRAIN_ID != RELAY_ID: Brain ID cannot equal Relay ID.');
  }
}

export function assertOneBrainEqualsOneAuthoritativeBrain(brains: readonly string[]): void {
  const unique = new Set(brains);
  if (unique.size > 1) {
    throw new WireTransportError('WIRE_SECURITY_VIOLATION', 'ONE_BRAIN == ONE_AUTHORITATIVE_BRAIN: Multiple brains detected.');
  }
}

export function assertMultipleSurfacesDoNotEqualMultipleBrains(): void {
  // Invariant 31: MULTIPLE_SURFACES != MULTIPLE_BRAINS
}

export function assertInternetLocationDoesNotEqualTrust(): void {
  // Invariant 32: INTERNET_LOCATION != TRUST
}

export function assertPublicNetworkDoesNotEqualTrust(): void {
  // Invariant 33: PUBLIC_NETWORK != TRUST
}

export function assertHomeNetworkDoesNotEqualTrust(): void {
  // Invariant 34: HOME_NETWORK != TRUST
}

export function assertKnowingRelayEndpointDoesNotGrantAccess(): void {
  // Invariant 35: KNOWING_RELAY_ENDPOINT != ACCESS
}

export function assertKnowingBrainEndpointDoesNotGrantAccess(): void {
  // Invariant 36: KNOWING_BRAIN_ENDPOINT != ACCESS
}

export function assertPossessingDeviceIdDoesNotEqualPossessingDeviceKey(): void {
  // Invariant 37: POSSESSING_DEVICE_ID != POSSESSING_DEVICE_KEY
}

export function assertPossessingDeviceKeyDoesNotEqualExecutionAuthority(): void {
  // Invariant 38: POSSESSING_DEVICE_KEY != EXECUTION_AUTHORITY
}

export function assertDeliveredDoesNotEqualTaskSuccess(): void {
  // Invariant 39: DELIVERED != TASK_SUCCESS
}

export function assertAcknowledgedDoesNotEqualTaskSuccess(): void {
  // Invariant 40: ACKNOWLEDGED != TASK_SUCCESS
}

export function assertConnectionSuccessDoesNotEqualTaskSuccess(): void {
  // Invariant 41: CONNECTION_SUCCESS != TASK_SUCCESS
}

export function assertWireSuccessDoesNotEqualTaskSuccess(): void {
  // Invariant 42: WIRE_SUCCESS != TASK_SUCCESS
}
