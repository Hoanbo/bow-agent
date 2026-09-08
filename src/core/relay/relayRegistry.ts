// src/core/relay/relayRegistry.ts
// BOWCON V4.0 — SECURE ALWAYS-ON BRAIN RELAY & REMOTE SESSION RUNTIME (MS-1.3.27)
//
// In-memory observational registry maintaining 9-tuple scope isolation.

import type { RelayId, RelaySurfaceType as SurfaceType } from './relayTypes.js';
import { RemoteSessionRecord } from './relaySession.js';

export class RelayRegistry {
  private readonly sessions = new Map<string, RemoteSessionRecord>();

  public registerSession(session: RemoteSessionRecord): void {
    this.sessions.set(session.sessionId, session);
  }

  public unregisterSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  public getSession(sessionId: string): RemoteSessionRecord | undefined {
    return this.sessions.get(sessionId);
  }

  public getAllSessions(): readonly RemoteSessionRecord[] {
    return Array.from(this.sessions.values());
  }

  public getSessionsForUser(userId: string): readonly RemoteSessionRecord[] {
    return Array.from(this.sessions.values()).filter((s) => s.userId === userId);
  }

  public getSessionsForDevice(deviceId: string): readonly RemoteSessionRecord[] {
    return Array.from(this.sessions.values()).filter((s) => s.deviceId === deviceId);
  }

  public getSessionsForSurface(surfaceType: SurfaceType): readonly RemoteSessionRecord[] {
    return Array.from(this.sessions.values()).filter((s) => s.surfaceType === surfaceType);
  }

  public getSessionsForRelay(relayId: RelayId): readonly RemoteSessionRecord[] {
    return Array.from(this.sessions.values()).filter((s) => s.relayId === relayId);
  }

  public count(): number {
    return this.sessions.size;
  }

  public clear(): void {
    this.sessions.clear();
  }
}
