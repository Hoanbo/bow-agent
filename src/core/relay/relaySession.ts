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

import type {
  RemoteSession,
  RelaySessionState,
  RelayId,
  RelaySurfaceType as SurfaceType,
} from './relayTypes.js';
import { assertValidRelayTransition } from './relayTransitions.js';

export class RelaySessionError extends Error {
  constructor(message: string) {
    super(`RELAY_SESSION_ERROR: ${message}`);
    this.name = 'RelaySessionError';
  }
}

/**
 * Mutable operational state wrapper for an active Remote Session.
 */
export class RemoteSessionRecord {
  public readonly sessionId: string;
  public readonly deviceId: string;
  public readonly relayId: RelayId;
  public readonly brainId: string;
  public readonly surfaceId: string;
  public readonly surfaceType: SurfaceType;
  public readonly tenantId: string;
  public readonly userId: string;
  public readonly connectionId: string;
  public readonly gatewayId: string;
  public readonly createdAt: number;

  private state: RelaySessionState;
  private lastActivityAt: number;
  private resumedAt?: number;
  private sequenceNumber: number = 0;
  private ackSequenceNumber: number = 0;
  private admissionState: 'PENDING' | 'ADMITTED' | 'REJECTED' = 'PENDING';
  private trustState: 'PENDING' | 'TRUSTED' | 'REVOKED' = 'PENDING';
  private resumeToken?: string;

  constructor(params: {
    sessionId: string;
    deviceId: string;
    relayId: RelayId;
    brainId: string;
    surfaceId: string;
    surfaceType: SurfaceType;
    tenantId: string;
    userId: string;
    connectionId: string;
    gatewayId: string;
    createdAt?: number;
    initialState?: RelaySessionState;
  }) {
    if (params.sessionId === params.deviceId) {
      throw new RelaySessionError(
        `INVARIANT_VIOLATION: DEVICE_ID cannot equal SESSION_ID (${params.sessionId})`
      );
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

  public getState(): RelaySessionState {
    return this.state;
  }

  public transitionTo(nextState: RelaySessionState): void {
    assertValidRelayTransition(this.state, nextState);
    this.state = nextState;
    this.lastActivityAt = Date.now();
  }

  public incrementSequence(): number {
    this.sequenceNumber += 1;
    this.lastActivityAt = Date.now();
    return this.sequenceNumber;
  }

  public getSequenceNumber(): number {
    return this.sequenceNumber;
  }

  public acknowledgeSequence(seq: number): void {
    if (seq > this.sequenceNumber) {
      throw new RelaySessionError(
        `CANNOT_ACK_FUTURE_SEQ: Ack seq ${seq} exceeds current seq ${this.sequenceNumber}`
      );
    }
    this.ackSequenceNumber = Math.max(this.ackSequenceNumber, seq);
    this.lastActivityAt = Date.now();
  }

  public getAckSequenceNumber(): number {
    return this.ackSequenceNumber;
  }

  public setAdmissionState(admission: 'PENDING' | 'ADMITTED' | 'REJECTED'): void {
    this.admissionState = admission;
    this.lastActivityAt = Date.now();
  }

  public getAdmissionState(): 'PENDING' | 'ADMITTED' | 'REJECTED' {
    return this.admissionState;
  }

  public setTrustState(trust: 'PENDING' | 'TRUSTED' | 'REVOKED'): void {
    this.trustState = trust;
    this.lastActivityAt = Date.now();
  }

  public getTrustState(): 'PENDING' | 'TRUSTED' | 'REVOKED' {
    return this.trustState;
  }

  public setResumeToken(token: string): void {
    this.resumeToken = token;
    this.lastActivityAt = Date.now();
  }

  public getResumeToken(): string | undefined {
    return this.resumeToken;
  }

  public markResumed(now: number = Date.now()): void {
    this.resumedAt = now;
    this.lastActivityAt = now;
  }

  public getLastActivityAt(): number {
    return this.lastActivityAt;
  }

  public updateActivity(now: number = Date.now()): void {
    this.lastActivityAt = now;
  }

  /**
   * Produces an immutable snapshot of this remote session.
   */
  public toImmutable(): RemoteSession {
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
export function assertSessionIsolation(a: RemoteSession, b: RemoteSession): void {
  if (a.sessionId === b.sessionId) {
    throw new RelaySessionError(`SESSION_COLLISION: Both sessions share ID ${a.sessionId}`);
  }
  // Even if they share deviceId (one device having multiple sessions sequentially), they are distinct sessions.
}
