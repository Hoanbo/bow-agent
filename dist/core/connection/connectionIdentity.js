// src/core/connection/connectionIdentity.ts
// BOWCON V4.0 — REAL BIDIRECTIONAL SECURE CONNECTION & SESSION RUNTIME (MS-1.3.22)
//
// Deterministic identity generation for connections, sessions, and peers.
// Absolutely zero Math.random(), zero crypto.randomUUID(), zero timestamps in identity.
import { computeConnectionFingerprint } from './connectionFingerprint.js';
/**
 * Creates deterministic peer identity: peer_<fingerprint>
 */
export function createDeterministicPeerId(seed) {
    const fp = computeConnectionFingerprint({
        userId: seed.userId,
        surfaceId: seed.surfaceId,
        deviceId: seed.deviceId || 'default_device',
        role: seed.role || 'peer',
    });
    return `peer_${fp}`;
}
/**
 * Creates deterministic connection identity: conn_<fingerprint>
 */
export function createDeterministicConnectionId(seed) {
    const fp = computeConnectionFingerprint({
        peerId: seed.peerId,
        surfaceId: seed.surfaceId,
        transportId: seed.transportId,
        adapterId: seed.adapterId,
        gatewayId: seed.gatewayId,
        sequenceSeed: seed.sequenceSeed ?? 0,
    });
    return `conn_${fp}`;
}
/**
 * Creates deterministic connection session identity: csess_<fingerprint>
 */
export function createDeterministicSessionId(seed) {
    const fp = computeConnectionFingerprint({
        connectionId: seed.connectionId,
        peerId: seed.peerId,
        brainId: seed.brainId,
        sessionId: seed.sessionId,
    });
    return `csess_${fp}`;
}
/**
 * Validates connection ID format: conn_[0-9a-f]{8}
 */
export function isConnectionId(id) {
    return typeof id === 'string' && /^conn_[0-9a-f]{8}$/.test(id);
}
/**
 * Validates session ID format: csess_[0-9a-f]{8}
 */
export function isConnectionSessionId(id) {
    return typeof id === 'string' && /^csess_[0-9a-f]{8}$/.test(id);
}
/**
 * Validates peer ID format: peer_[0-9a-f]{8}
 */
export function isPeerId(id) {
    return typeof id === 'string' && /^peer_[0-9a-f]{8}$/.test(id);
}
