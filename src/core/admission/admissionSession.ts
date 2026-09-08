// src/core/admission/admissionSession.ts
// BOWCON V4.0 — ZERO-TRUST ALWAYS-ON BRAIN CONNECTIVITY & SECURE INTERNET ADMISSION RUNTIME (MS-1.3.26)
//
// Bridge to Connection & Session Runtime (MS-1.3.22).
// STRICT INVARIANTS:
// - DEVICE_ID != SESSION_ID
// - RECONNECT != RE-EXECUTE (Reconnection NEVER automatically re-executes interrupted tasks)
// - Session creation remains distinct from persistent device identity.

import type { ScopedDeviceIdentity } from '../pairing/pairingTypes.js';
import type { NetworkMetadata } from './admissionTypes.js';

export interface AdmissionSessionBinding {
  readonly sessionId: string;
  readonly deviceId: string;
  readonly scope: ScopedDeviceIdentity;
  readonly initialNetwork: NetworkMetadata;
  readonly currentNetwork: NetworkMetadata;
  readonly createdAt: number;
  readonly lastActiveAt: number;
  readonly reconnectedCount: number;
  readonly active: boolean;
}

export class AdmissionSessionCoordinator {
  private readonly sessions = new Map<string, AdmissionSessionBinding>();
  private readonly deviceActiveSessions = new Map<string, Set<string>>(); // deviceId -> Set<sessionId>

  /**
   * Binds a newly admitted session to a persistent device.
   * Generates or validates distinct sessionId.
   */
  public establishSession(
    deviceId: string,
    scope: ScopedDeviceIdentity,
    network: NetworkMetadata,
    assignedSessionId?: string,
    now: number = Date.now()
  ): AdmissionSessionBinding {
    const sessionId = assignedSessionId || `ses_adm_${deviceId}_${now}_${this.sessions.size + 1}`;

    // STRICT INVARIANT: DEVICE_ID != SESSION_ID
    if (sessionId === deviceId) {
      throw new Error(`[ADMISSION_SESSION_INVALID] sessionId cannot be identical to deviceId (${deviceId}). Fail-closed.`);
    }

    const binding: AdmissionSessionBinding = Object.freeze({
      sessionId,
      deviceId,
      scope,
      initialNetwork: network,
      currentNetwork: network,
      createdAt: now,
      lastActiveAt: now,
      reconnectedCount: 0,
      active: true,
    });

    this.sessions.set(sessionId, binding);

    let activeSet = this.deviceActiveSessions.get(deviceId);
    if (!activeSet) {
      activeSet = new Set<string>();
      this.deviceActiveSessions.set(deviceId, activeSet);
    }
    activeSet.add(sessionId);

    return binding;
  }

  /**
   * Validates and performs controlled session resume across roaming network transitions.
   * Invariant: RECONNECT != RE-EXECUTE.
   */
  public resumeSession(
    sessionId: string,
    deviceId: string,
    scope: ScopedDeviceIdentity,
    newNetwork: NetworkMetadata,
    now: number = Date.now()
  ): AdmissionSessionBinding {
    const existing = this.sessions.get(sessionId);
    if (!existing || !existing.active) {
      throw new Error(`[ADMISSION_SESSION_NOT_FOUND] Session ${sessionId} is inactive or not found.`);
    }

    if (existing.deviceId !== deviceId) {
      throw new Error(`[ADMISSION_SESSION_MISMATCH] Session ${sessionId} does not belong to device ${deviceId}.`);
    }

    if (existing.scope.userId !== scope.userId || existing.scope.surfaceId !== scope.surfaceId) {
      throw new Error(`[ADMISSION_SCOPE_MISMATCH] Session resume scope mismatch for session ${sessionId}.`);
    }

    const updated: AdmissionSessionBinding = Object.freeze({
      ...existing,
      currentNetwork: newNetwork,
      lastActiveAt: now,
      reconnectedCount: existing.reconnectedCount + 1,
    });

    this.sessions.set(sessionId, updated);
    return updated;
  }

  public createSession(
    deviceId: string,
    scope: ScopedDeviceIdentity,
    network: NetworkMetadata,
    assignedSessionId?: string,
    now: number = Date.now()
  ): AdmissionSessionBinding {
    return this.establishSession(deviceId, scope, network, assignedSessionId, now);
  }

  public validateSessionResume(
    sessionId: string,
    nextSequence: number,
    lastAckedSequence: number
  ): { valid: boolean; failureReason?: string } {
    const existing = this.sessions.get(sessionId);
    if (!existing || !existing.active) {
      return { valid: false, failureReason: `Session ${sessionId} not found or inactive` };
    }
    if (nextSequence !== lastAckedSequence + 1) {
      return { valid: false, failureReason: `Sequence gap detected: expected ${lastAckedSequence + 1}, got ${nextSequence}` };
    }
    return { valid: true };
  }

  public terminateSession(sessionId: string): boolean {
    const existing = this.sessions.get(sessionId);
    if (!existing) {
      return false;
    }

    this.sessions.delete(sessionId);
    const activeSet = this.deviceActiveSessions.get(existing.deviceId);
    if (activeSet) {
      activeSet.delete(sessionId);
      if (activeSet.size === 0) {
        this.deviceActiveSessions.delete(existing.deviceId);
      }
    }
    return true;
  }

  public getSession(sessionId: string): AdmissionSessionBinding | undefined {
    return this.sessions.get(sessionId);
  }

  public getActiveSessionsForDevice(deviceId: string): readonly AdmissionSessionBinding[] {
    const sessionIds = this.deviceActiveSessions.get(deviceId);
    if (!sessionIds || sessionIds.size === 0) {
      return [];
    }
    const list: AdmissionSessionBinding[] = [];
    for (const id of sessionIds) {
      const s = this.sessions.get(id);
      if (s) {
        list.push(s);
      }
    }
    return Object.freeze(list);
  }

  public size(): number {
    return this.sessions.size;
  }

  public clear(): void {
    this.sessions.clear();
    this.deviceActiveSessions.clear();
  }
}
