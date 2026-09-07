// src/core/connection/connectionSession.ts
// BOWCON V4.0 — REAL BIDIRECTIONAL SECURE CONNECTION & SESSION RUNTIME (MS-1.3.22)
//
// Immutable remote connection session snapshots.
// Timestamps are strictly observational metadata and do NOT participate in identity calculation.
import { deepFreeze } from './connectionScope.js';
import { computeConnectionFingerprint } from './connectionFingerprint.js';
/**
 * Creates an immutable, deterministic ConnectionSessionSnapshot
 */
export function createConnectionSessionSnapshot(params) {
    const fp = computeConnectionFingerprint({
        sessionId: params.sessionId,
        connectionId: params.connectionId,
        peerId: params.peerId,
        scopeIdentity: params.scopeIdentity,
        authenticationState: params.authenticationState ?? 'UNAUTHENTICATED',
        authorizationState: params.authorizationState ?? 'UNAUTHORIZED',
        grantedCapabilities: params.grantedCapabilities ?? [],
        sessionState: params.sessionState ?? 'CREATED',
        connectionState: params.connectionState ?? 'INITIALIZING',
        lastReceivedSequence: params.lastReceivedSequence ?? 0,
        lastSentSequence: params.lastSentSequence ?? 0,
        lastAcknowledgedSequence: params.lastAcknowledgedSequence ?? 0,
    });
    const now = new Date().toISOString();
    return deepFreeze({
        sessionId: params.sessionId,
        connectionId: params.connectionId,
        peerId: params.peerId,
        scopeIdentity: deepFreeze({ ...params.scopeIdentity }),
        authenticationState: params.authenticationState ?? 'UNAUTHENTICATED',
        authorizationState: params.authorizationState ?? 'UNAUTHORIZED',
        grantedCapabilities: Object.freeze([...(params.grantedCapabilities ?? [])]),
        sessionState: params.sessionState ?? 'CREATED',
        connectionState: params.connectionState ?? 'INITIALIZING',
        lastReceivedSequence: params.lastReceivedSequence ?? 0,
        lastSentSequence: params.lastSentSequence ?? 0,
        lastAcknowledgedSequence: params.lastAcknowledgedSequence ?? 0,
        heartbeatState: params.heartbeatState ?? 'NORMAL',
        connectionHealth: params.connectionHealth ?? 'HEALTHY',
        pendingMessageCount: params.pendingMessageCount ?? 0,
        observationalMetadata: deepFreeze({
            createdAt: params.observationalMetadata?.createdAt ?? now,
            lastActiveAt: params.observationalMetadata?.lastActiveAt ?? now,
            totalSent: params.observationalMetadata?.totalSent ?? 0,
            totalReceived: params.observationalMetadata?.totalReceived ?? 0,
        }),
        fingerprint: fp,
    });
}
