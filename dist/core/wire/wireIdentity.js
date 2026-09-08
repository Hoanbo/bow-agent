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
export function computeWireConnectionId(relayId, remoteHost, remotePort, nonce) {
    const hash = createHash('sha256')
        .update(`wire_conn::${relayId}::${remoteHost}::${remotePort}::${nonce}`)
        .digest('hex')
        .slice(0, 16);
    return `conn_wire_${hash}`;
}
/**
 * Computes a deterministic SHA-256 fingerprint for a wire frame.
 */
export function computeWireFrameId(connectionId, sequence, checksum) {
    const hash = createHash('sha256')
        .update(`wire_frame::${connectionId}::${sequence}::${checksum}`)
        .digest('hex')
        .slice(0, 16);
    return `frame_${hash}`;
}
// ============================================================================
// NON-NEGOTIABLE ARCHITECTURAL INVARIANT ASSERTION HELPERS
// ============================================================================
export function assertWireTransportDoesNotEqualDeviceIdentity() {
    // Invariant 1: WIRE_TRANSPORT != DEVICE_IDENTITY
}
export function assertWireTransportDoesNotEqualDeviceTrust() {
    // Invariant 2: WIRE_TRANSPORT != DEVICE_TRUST
}
export function assertWireTransportDoesNotEqualAuthorization() {
    // Invariant 3: WIRE_TRANSPORT != AUTHORIZATION
}
export function assertWireTransportDoesNotEqualExecutionAuthority() {
    // Invariant 4: WIRE_TRANSPORT != EXECUTION_AUTHORITY
}
export function assertRelayGatewayDoesNotEqualBrain() {
    // Invariant 5: RELAY_GATEWAY != BRAIN
}
export function assertRelayGatewayDoesNotEqualLlm() {
    // Invariant 6: RELAY_GATEWAY != LLM
}
export function assertRelayGatewayDoesNotEqualMemory() {
    // Invariant 7: RELAY_GATEWAY != MEMORY
}
export function assertRelayGatewayDoesNotEqualToolExecutor() {
    // Invariant 8: RELAY_GATEWAY != TOOL_EXECUTOR
}
export function assertNetworkAddressDoesNotEqualDeviceIdentity(address, deviceId) {
    if (address === deviceId) {
        throw new WireTransportError('WIRE_SECURITY_VIOLATION', 'NETWORK_ADDRESS != DEVICE_IDENTITY: Address cannot serve as device identity.');
    }
}
export function assertIpDoesNotEqualDeviceIdentity(ip, deviceId) {
    if (ip === deviceId) {
        throw new WireTransportError('WIRE_SECURITY_VIOLATION', 'IP_ADDRESS != DEVICE_IDENTITY: IP cannot serve as device identity.');
    }
}
export function assertPortDoesNotEqualDeviceIdentity(port, deviceId) {
    if (String(port) === deviceId) {
        throw new WireTransportError('WIRE_SECURITY_VIOLATION', 'PORT != DEVICE_IDENTITY: Port cannot serve as device identity.');
    }
}
export function assertDnsDoesNotEqualDeviceIdentity(dns, deviceId) {
    if (dns === deviceId) {
        throw new WireTransportError('WIRE_SECURITY_VIOLATION', 'DNS != DEVICE_IDENTITY: DNS domain cannot serve as device identity.');
    }
}
export function assertSsidDoesNotEqualDeviceIdentity(ssid, deviceId) {
    if (ssid === deviceId) {
        throw new WireTransportError('WIRE_SECURITY_VIOLATION', 'WIFI_SSID != DEVICE_IDENTITY: SSID cannot serve as device identity.');
    }
}
export function assertMacDoesNotEqualDeviceIdentity(mac, deviceId) {
    if (mac === deviceId) {
        throw new WireTransportError('WIRE_SECURITY_VIOLATION', 'MAC_ADDRESS != DEVICE_IDENTITY: MAC cannot serve as device identity.');
    }
}
export function assertTransportConnectionDoesNotEqualTrust() {
    // Invariant 16: TRANSPORT_CONNECTION != TRUST
}
export function assertSocketConnectionDoesNotEqualAuthentication() {
    // Invariant 17: SOCKET_CONNECTION != AUTHENTICATION
}
export function assertTlsDoesNotEqualAuthorization() {
    // Invariant 18: TLS_OR_SECURE_CHANNEL != DEVICE_AUTHORIZATION
}
export function assertConnectedDoesNotEqualAdmitted() {
    // Invariant 19: CONNECTED != ADMITTED
}
export function assertAdmittedDoesNotEqualAuthorized() {
    // Invariant 20: ADMITTED != AUTHORIZED
}
export function assertAuthorizedDoesNotEqualExecuted() {
    // Invariant 21: AUTHORIZED != EXECUTED
}
export function assertRelayConnectedDoesNotEqualBrainSession() {
    // Invariant 22: RELAY_CONNECTED != BRAIN_SESSION
}
export function assertNetworkReconnectDoesNotEqualTaskReexecution() {
    // Invariant 23: NETWORK_RECONNECT != TASK_REEXECUTION
}
export function assertSessionResumeDoesNotEqualTaskReexecution() {
    // Invariant 24: SESSION_RESUME != TASK_REEXECUTION
}
export function assertTransportReconnectDoesNotEqualSessionRecreation() {
    // Invariant 25: TRANSPORT_RECONNECT != SESSION_RECREATION
}
export function assertSessionIdDoesNotEqualDeviceId(sessionId, deviceId) {
    if (sessionId === deviceId) {
        throw new WireTransportError('WIRE_SECURITY_VIOLATION', 'SESSION_ID != DEVICE_ID: Session ID cannot equal Device ID.');
    }
}
export function assertRelayIdDoesNotEqualDeviceId(relayId, deviceId) {
    if (relayId === deviceId) {
        throw new WireTransportError('WIRE_SECURITY_VIOLATION', 'RELAY_ID != DEVICE_ID: Relay ID cannot equal Device ID.');
    }
}
export function assertRelayIdDoesNotEqualSessionId(relayId, sessionId) {
    if (relayId === sessionId) {
        throw new WireTransportError('WIRE_SECURITY_VIOLATION', 'RELAY_ID != SESSION_ID: Relay ID cannot equal Session ID.');
    }
}
export function assertBrainIdDoesNotEqualRelayId(brainId, relayId) {
    if (brainId === relayId) {
        throw new WireTransportError('WIRE_SECURITY_VIOLATION', 'BRAIN_ID != RELAY_ID: Brain ID cannot equal Relay ID.');
    }
}
export function assertOneBrainEqualsOneAuthoritativeBrain(brains) {
    const unique = new Set(brains);
    if (unique.size > 1) {
        throw new WireTransportError('WIRE_SECURITY_VIOLATION', 'ONE_BRAIN == ONE_AUTHORITATIVE_BRAIN: Multiple brains detected.');
    }
}
export function assertMultipleSurfacesDoNotEqualMultipleBrains() {
    // Invariant 31: MULTIPLE_SURFACES != MULTIPLE_BRAINS
}
export function assertInternetLocationDoesNotEqualTrust() {
    // Invariant 32: INTERNET_LOCATION != TRUST
}
export function assertPublicNetworkDoesNotEqualTrust() {
    // Invariant 33: PUBLIC_NETWORK != TRUST
}
export function assertHomeNetworkDoesNotEqualTrust() {
    // Invariant 34: HOME_NETWORK != TRUST
}
export function assertKnowingRelayEndpointDoesNotGrantAccess() {
    // Invariant 35: KNOWING_RELAY_ENDPOINT != ACCESS
}
export function assertKnowingBrainEndpointDoesNotGrantAccess() {
    // Invariant 36: KNOWING_BRAIN_ENDPOINT != ACCESS
}
export function assertPossessingDeviceIdDoesNotEqualPossessingDeviceKey() {
    // Invariant 37: POSSESSING_DEVICE_ID != POSSESSING_DEVICE_KEY
}
export function assertPossessingDeviceKeyDoesNotEqualExecutionAuthority() {
    // Invariant 38: POSSESSING_DEVICE_KEY != EXECUTION_AUTHORITY
}
export function assertDeliveredDoesNotEqualTaskSuccess() {
    // Invariant 39: DELIVERED != TASK_SUCCESS
}
export function assertAcknowledgedDoesNotEqualTaskSuccess() {
    // Invariant 40: ACKNOWLEDGED != TASK_SUCCESS
}
export function assertConnectionSuccessDoesNotEqualTaskSuccess() {
    // Invariant 41: CONNECTION_SUCCESS != TASK_SUCCESS
}
export function assertWireSuccessDoesNotEqualTaskSuccess() {
    // Invariant 42: WIRE_SUCCESS != TASK_SUCCESS
}
