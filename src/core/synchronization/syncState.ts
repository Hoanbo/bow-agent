// src/core/synchronization/syncState.ts
// BOWCON V4.0 — MILESTONE 1.3.18: SCOPED SYNCHRONIZATION STATE MODEL
//
// EN:
// Authoritative in-memory state tracking for scoped Brain synchronization.
// Manages the relationship between Brain events, active surfaces, observations, and ACKs.
//
// VI:
// Mô hình trạng thái trong bộ nhớ có thẩm quyền cho đồng bộ hóa Não bộ theo phạm vi.
// Quản lý mối quan hệ giữa các sự kiện Não bộ, các bề mặt hoạt động, các lượt quan sát và xác nhận (ACK).

import type {
  SyncObservation,
  SyncAcknowledgement,
  SyncCheckpoint,
  SynchronizationState,
  SyncHealth,
} from './syncTypes.js';
import type { SyncFailureCode } from './eventTypes.js';
import { EventRegistry } from './eventRegistry.js';
import { deepFreeze } from './eventEnvelope.js';

export class ScopedSynchronizationState {
  public readonly brainId: string;
  public readonly userId: string;
  public readonly sessionId: string;
  public readonly eventRegistry: EventRegistry;

  private readonly activeSurfaces: Set<string> = new Set();
  private readonly observationsBySurface: Map<string, SyncObservation[]> = new Map();
  private readonly acknowledgementsBySurface: Map<string, SyncAcknowledgement[]> = new Map();
  private latestCheckpoint?: SyncCheckpoint;
  private health: SyncHealth = 'HEALTHY';
  private lastError?: {
    readonly code: SyncFailureCode;
    readonly reason: string;
    readonly timestamp: number;
  };

  constructor(brainId: string, userId: string, sessionId: string) {
    this.brainId = brainId;
    this.userId = userId;
    this.sessionId = sessionId;
    this.eventRegistry = new EventRegistry(brainId, userId, sessionId);
  }

  public registerActiveSurface(surfaceId: string): void {
    this.activeSurfaces.add(surfaceId);
  }

  public removeActiveSurface(surfaceId: string): void {
    this.activeSurfaces.delete(surfaceId);
  }

  public isSurfaceActive(surfaceId: string): boolean {
    return this.activeSurfaces.has(surfaceId);
  }

  public getActiveSurfaces(): readonly string[] {
    return Object.freeze(Array.from(this.activeSurfaces).sort());
  }

  public recordObservation(observation: SyncObservation): void {
    const list = this.observationsBySurface.get(observation.surfaceId) ?? [];
    list.push(observation);
    this.observationsBySurface.set(observation.surfaceId, list);
  }

  public recordAcknowledgement(ack: SyncAcknowledgement): void {
    const list = this.acknowledgementsBySurface.get(ack.surfaceId) ?? [];
    list.push(ack);
    this.acknowledgementsBySurface.set(ack.surfaceId, list);
  }

  public setLatestCheckpoint(checkpoint: SyncCheckpoint): void {
    this.latestCheckpoint = checkpoint;
  }

  public getLatestCheckpoint(): SyncCheckpoint | undefined {
    return this.latestCheckpoint;
  }

  public setHealth(health: SyncHealth): void {
    this.health = health;
  }

  public getHealth(): SyncHealth {
    return this.health;
  }

  public setLastError(error: { code: SyncFailureCode; reason: string; timestamp: number }): void {
    this.lastError = error;
  }

  public getLastError(): { code: SyncFailureCode; reason: string; timestamp: number } | undefined {
    return this.lastError;
  }

  public getObservationsForSurface(surfaceId: string): readonly SyncObservation[] {
    return Object.freeze([...(this.observationsBySurface.get(surfaceId) ?? [])]);
  }

  public getAcknowledgementsForSurface(surfaceId: string): readonly SyncAcknowledgement[] {
    return Object.freeze([...(this.acknowledgementsBySurface.get(surfaceId) ?? [])]);
  }

  /**
   * EN: Creates a deeply frozen snapshot of the current synchronization state.
   * VI: Tạo một ảnh chụp bất biến sâu về trạng thái đồng bộ hóa hiện tại.
   */
  public toSnapshot(): SynchronizationState {
    const obsRecord: Record<string, readonly SyncObservation[]> = {};
    for (const [sId, obsList] of this.observationsBySurface.entries()) {
      obsRecord[sId] = Object.freeze([...obsList]);
    }

    const ackRecord: Record<string, readonly SyncAcknowledgement[]> = {};
    for (const [sId, ackList] of this.acknowledgementsBySurface.entries()) {
      ackRecord[sId] = Object.freeze([...ackList]);
    }

    const snapshot: SynchronizationState = {
      brainId: this.brainId,
      userId: this.userId,
      sessionId: this.sessionId,
      lastSequence: this.eventRegistry.getLastSequence(),
      latestEvent: this.eventRegistry.getLastEvent(),
      activeSurfaces: this.getActiveSurfaces(),
      surfaceObservations: obsRecord,
      surfaceAcknowledgements: ackRecord,
      latestCheckpoint: this.latestCheckpoint,
      health: this.health,
      lastError: this.lastError,
    };

    return deepFreeze(snapshot);
  }
}
