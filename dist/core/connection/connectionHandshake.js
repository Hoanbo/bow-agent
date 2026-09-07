// src/core/connection/connectionHandshake.ts
// BOWCON V4.0 — REAL BIDIRECTIONAL SECURE CONNECTION & SESSION RUNTIME (MS-1.3.22)
//
// Pure-data handshake negotiation lifecycle:
// HELLO -> CAPABILITY_OFFER -> CAPABILITY_ACCEPT -> AUTH_REQUEST -> AUTH_RESULT -> SESSION_ESTABLISHED -> READY
//
// Invariants:
// - Handshake MUST NOT imply authorization.
// - Handshake MUST NOT imply execution.
// - Handshake MUST NOT imply task success.
import { CONNECTION_PROTOCOL_VERSION } from './connectionTypes.js';
import { createConnectionScope, deepFreeze } from './connectionScope.js';
import { computeConnectionFingerprint } from './connectionFingerprint.js';
export const HANDSHAKE_LIFECYCLE_ORDER = Object.freeze([
    'HELLO',
    'CAPABILITY_OFFER',
    'CAPABILITY_ACCEPT',
    'AUTH_REQUEST',
    'AUTH_RESULT',
    'SESSION_ESTABLISHED',
    'READY',
]);
/**
 * Validates whether transition from currentStage to nextStage is valid in the handshake sequence
 */
export function evaluateHandshakeSequence(currentStage, nextStage) {
    const currentIndex = HANDSHAKE_LIFECYCLE_ORDER.indexOf(currentStage);
    const nextIndex = HANDSHAKE_LIFECYCLE_ORDER.indexOf(nextStage);
    if (currentIndex === -1 || nextIndex === -1)
        return false;
    return nextIndex === currentIndex + 1;
}
/**
 * Builds canonical HandshakePayload
 */
function buildHandshakePayload(stage, identity, metadata) {
    const scope = createConnectionScope(identity);
    const fp = computeConnectionFingerprint({
        stage,
        scope,
        protocolVersion: CONNECTION_PROTOCOL_VERSION,
        metadata,
    });
    return deepFreeze({
        stage,
        scope,
        protocolVersion: CONNECTION_PROTOCOL_VERSION,
        metadata: deepFreeze({ ...metadata }),
        fingerprint: fp,
    });
}
export function createHandshakeHello(identity, clientVersion = CONNECTION_PROTOCOL_VERSION) {
    return buildHandshakePayload('HELLO', identity, { clientVersion });
}
export function createCapabilityOffer(identity, requestedCapabilities) {
    return buildHandshakePayload('CAPABILITY_OFFER', identity, { requestedCapabilities: [...requestedCapabilities] });
}
export function createCapabilityAccept(identity, acceptedCapabilities) {
    return buildHandshakePayload('CAPABILITY_ACCEPT', identity, { acceptedCapabilities: [...acceptedCapabilities] });
}
export function createAuthRequest(identity, authPayload) {
    return buildHandshakePayload('AUTH_REQUEST', identity, { ...authPayload });
}
export function createAuthResult(identity, authenticated, peerId, error) {
    return buildHandshakePayload('AUTH_RESULT', identity, {
        authenticated,
        peerId,
        error: error || null,
    });
}
export function createSessionEstablished(identity, sessionId) {
    return buildHandshakePayload('SESSION_ESTABLISHED', identity, { sessionId });
}
export function createHandshakeReady(identity) {
    return buildHandshakePayload('READY', identity, {});
}
