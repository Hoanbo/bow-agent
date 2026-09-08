// src/core/admission/admissionRegistry.ts
// BOWCON V4.0 — ZERO-TRUST ALWAYS-ON BRAIN CONNECTIVITY & SECURE INTERNET ADMISSION RUNTIME (MS-1.3.26)
//
// In-memory observational admission registry.
// Preserves scope isolation and tracks active admitted states without granting execution authority.

import type { ScopedDeviceIdentity } from '../pairing/pairingTypes.js';
import type { AdmissionDecision, NetworkMetadata } from './admissionTypes.js';

export interface AdmittedDeviceRecord {
  readonly deviceId: string;
  readonly scope: ScopedDeviceIdentity;
  readonly currentNetwork: NetworkMetadata;
  readonly sessionId: string;
  readonly admittedAt: number;
  readonly lastActiveAt: number;
  readonly decision: AdmissionDecision;
}

export class AdmissionRegistry {
  private readonly records = new Map<string, AdmittedDeviceRecord>();
  private readonly deviceIdsByUserId = new Map<string, Set<string>>();

  public recordAdmitted(
    deviceId: string,
    scope: ScopedDeviceIdentity,
    network: NetworkMetadata,
    sessionId: string,
    decision: AdmissionDecision,
    now: number = Date.now()
  ): AdmittedDeviceRecord {
    const record: AdmittedDeviceRecord = Object.freeze({
      deviceId,
      scope,
      currentNetwork: network,
      sessionId,
      admittedAt: now,
      lastActiveAt: now,
      decision,
    });

    this.records.set(deviceId, record);

    let userSet = this.deviceIdsByUserId.get(scope.userId);
    if (!userSet) {
      userSet = new Set<string>();
      this.deviceIdsByUserId.set(scope.userId, userSet);
    }
    userSet.add(deviceId);

    return record;
  }

  public getAdmitted(deviceId: string): AdmittedDeviceRecord | undefined {
    return this.records.get(deviceId);
  }

  public isAdmitted(deviceId: string): boolean {
    return this.records.has(deviceId);
  }

  public updateNetwork(deviceId: string, newNetwork: NetworkMetadata, now: number = Date.now()): boolean {
    const existing = this.records.get(deviceId);
    if (!existing) {
      return false;
    }

    const updated: AdmittedDeviceRecord = Object.freeze({
      ...existing,
      currentNetwork: newNetwork,
      lastActiveAt: now,
    });

    this.records.set(deviceId, updated);
    return true;
  }

  public remove(deviceId: string): boolean {
    const existing = this.records.get(deviceId);
    if (!existing) {
      return false;
    }

    this.records.delete(deviceId);
    const userSet = this.deviceIdsByUserId.get(existing.scope.userId);
    if (userSet) {
      userSet.delete(deviceId);
      if (userSet.size === 0) {
        this.deviceIdsByUserId.delete(existing.scope.userId);
      }
    }
    return true;
  }

  public getDevicesForUser(userId: string): readonly AdmittedDeviceRecord[] {
    const deviceIds = this.deviceIdsByUserId.get(userId);
    if (!deviceIds || deviceIds.size === 0) {
      return [];
    }
    const list: AdmittedDeviceRecord[] = [];
    for (const id of deviceIds) {
      const rec = this.records.get(id);
      if (rec) {
        list.push(rec);
      }
    }
    return Object.freeze(list);
  }

  public size(): number {
    return this.records.size;
  }

  public clear(): void {
    this.records.clear();
    this.deviceIdsByUserId.clear();
  }
}
