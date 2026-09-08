// src/core/relay/relayMultiplexing.ts
// BOWCON V4.0 — SECURE ALWAYS-ON BRAIN RELAY & REMOTE SESSION RUNTIME (MS-1.3.27)
//
// Multi-surface session multiplexing and cross-boundary isolation.
//
// INVARIANTS:
// - Cross-user routing = REJECT
// - Cross-device session injection = REJECT
// - Cross-surface routing = REJECT
// - Cross-Brain routing = REJECT
// - Multiple surfaces (Desktop, Mobile, Robot, Voice, Web) connect to ONE Brain.

import type { RelayMessage } from './relayTypes.js';
import { RemoteSessionRecord } from './relaySession.js';

export class RelayMultiplexingError extends Error {
  constructor(message: string) {
    super(`RELAY_MULTIPLEXING_ERROR: ${message}`);
    this.name = 'RelayMultiplexingError';
  }
}

export class RelayMultiplexer {
  private readonly sessions = new Map<string, RemoteSessionRecord>();

  public registerSession(session: RemoteSessionRecord): void {
    if (this.sessions.has(session.sessionId)) {
      throw new RelayMultiplexingError(`Session ${session.sessionId} is already multiplexed.`);
    }
    this.sessions.set(session.sessionId, session);
  }

  public unregisterSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  public getSession(sessionId: string): RemoteSessionRecord | undefined {
    return this.sessions.get(sessionId);
  }

  public getActiveSessions(): readonly RemoteSessionRecord[] {
    return Array.from(this.sessions.values());
  }

  public getSessionsForDevice(deviceId: string): readonly RemoteSessionRecord[] {
    return Array.from(this.sessions.values()).filter((s) => s.deviceId === deviceId);
  }

  /**
   * Routes an inbound message to its registered isolated session.
   * Enforces strict defense against cross-tenant, cross-user, cross-device,
   * cross-surface, and cross-Brain injection.
   */
  public routeInbound(message: RelayMessage): RemoteSessionRecord {
    const session = this.sessions.get(message.sessionId);
    if (!session) {
      throw new RelayMultiplexingError(
        `UNKNOWN_SESSION: Inbound message targeted non-existent session ${message.sessionId}`
      );
    }

    // Cross-device injection defense
    if (session.deviceId !== message.deviceId) {
      throw new RelayMultiplexingError(
        `CROSS_DEVICE_INJECTION: Message deviceId ${message.deviceId} does not match session deviceId ${session.deviceId}`
      );
    }

    // Cross-surface injection defense
    if (session.surfaceType !== message.surfaceType || session.surfaceId !== message.surfaceId) {
      throw new RelayMultiplexingError(
        `CROSS_SURFACE_INJECTION: Message surface ${message.surfaceType}:${message.surfaceId} does not match session surface ${session.surfaceType}:${session.surfaceId}`
      );
    }

    // Cross-Brain injection defense
    if (session.brainId !== message.brainId) {
      throw new RelayMultiplexingError(
        `CROSS_BRAIN_INJECTION: Message brainId ${message.brainId} does not match session brainId ${session.brainId}`
      );
    }

    return session;
  }

  public clear(): void {
    this.sessions.clear();
  }
}
