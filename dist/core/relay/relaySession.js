// src/core/relay/relaySession.ts
// BOWCON V4.0 — SECURE ALWAYS-ON BRAIN RELAY & REMOTE SESSION RUNTIME (MS-1.3.27)
//
// Long-lived Remote Session abstraction, isolation, and lifecycle.
//
// INVARIANTS:
// - DEVICE_ID != SESSION_ID
// - SESSION != TASK
// - ONE_DEVICE != ONE_SESSION
// - ONE_USER != ONE_DEVICE
// - Immutable session identity with isolated mutable operational state.
import { assertValidRelayTransition } from './relayTransitions.js';
export class RelaySessionError extends Error {
    constructor(message) {
        super(`RELAY_SESSION_ERROR: ${message}`);
        this.name = 'RelaySessionError';
    }
}
/**
 * Mutable operational state wrapper for an active Remote Session.
 */
export class RemoteSessionRecord {
    sessionId;
    deviceId;
    relayId;
    brainId;
    surfaceId;
    surfaceType;
    tenantId;
    userId;
    connectionId;
    gatewayId;
    createdAt;
    state;
    lastActivityAt;
    resumedAt;
    sequenceNumber = 0;
    ackSequenceNumber = 0;
    admissionState = 'PENDING';
    trustState = 'PENDING';
    resumeToken;
    constructor(params) {
        if (params.sessionId === params.deviceId) {
            throw new RelaySessionError(`INVARIANT_VIOLATION: DEVICE_ID cannot equal SESSION_ID (${params.sessionId})`);
        }
        this.sessionId = params.sessionId;
        this.deviceId = params.deviceId;
        this.relayId = params.relayId;
        this.brainId = params.brainId;
        this.surfaceId = params.surfaceId;
        this.surfaceType = params.surfaceType;
        this.tenantId = params.tenantId;
        this.userId = params.userId;
        this.connectionId = params.connectionId;
        this.gatewayId = params.gatewayId;
        this.createdAt = params.createdAt ?? Date.now();
        this.lastActivityAt = this.createdAt;
        this.state = params.initialState ?? 'SESSION_ESTABLISHING';
    }
    getState() {
        return this.state;
    }
    transitionTo(nextState) {
        assertValidRelayTransition(this.state, nextState);
        this.state = nextState;
        this.lastActivityAt = Date.now();
    }
    incrementSequence() {
        this.sequenceNumber += 1;
        this.lastActivityAt = Date.now();
        return this.sequenceNumber;
    }
    getSequenceNumber() {
        return this.sequenceNumber;
    }
    acknowledgeSequence(seq) {
        if (seq > this.sequenceNumber) {
            throw new RelaySessionError(`CANNOT_ACK_FUTURE_SEQ: Ack seq ${seq} exceeds current seq ${this.sequenceNumber}`);
        }
        this.ackSequenceNumber = Math.max(this.ackSequenceNumber, seq);
        this.lastActivityAt = Date.now();
    }
    getAckSequenceNumber() {
        return this.ackSequenceNumber;
    }
    setAdmissionState(admission) {
        this.admissionState = admission;
        this.lastActivityAt = Date.now();
    }
    getAdmissionState() {
        return this.admissionState;
    }
    setTrustState(trust) {
        this.trustState = trust;
        this.lastActivityAt = Date.now();
    }
    getTrustState() {
        return this.trustState;
    }
    setResumeToken(token) {
        this.resumeToken = token;
        this.lastActivityAt = Date.now();
    }
    getResumeToken() {
        return this.resumeToken;
    }
    markResumed(now = Date.now()) {
        this.resumedAt = now;
        this.lastActivityAt = now;
    }
    getLastActivityAt() {
        return this.lastActivityAt;
    }
    updateActivity(now = Date.now()) {
        this.lastActivityAt = now;
    }
    /**
     * Produces an immutable snapshot of this remote session.
     */
    toImmutable() {
        return Object.freeze({
            sessionId: this.sessionId,
            deviceId: this.deviceId,
            relayId: this.relayId,
            brainId: this.brainId,
            surfaceId: this.surfaceId,
            surfaceType: this.surfaceType,
            tenantId: this.tenantId,
            userId: this.userId,
            connectionId: this.connectionId,
            gatewayId: this.gatewayId,
            createdAt: this.createdAt,
            lastActivityAt: this.lastActivityAt,
            resumedAt: this.resumedAt,
            state: this.state,
            sequenceNumber: this.sequenceNumber,
            ackSequenceNumber: this.ackSequenceNumber,
            admissionState: this.admissionState,
            trustState: this.trustState,
            resumeToken: this.resumeToken,
        });
    }
}
/**
 * Asserts complete isolation between two distinct remote sessions.
 */
export function assertSessionIsolation(a, b) {
    if (a.sessionId === b.sessionId) {
        throw new RelaySessionError(`SESSION_COLLISION: Both sessions share ID ${a.sessionId}`);
    }
    // Even if they share deviceId (one device having multiple sessions sequentially), they are distinct sessions.
}
