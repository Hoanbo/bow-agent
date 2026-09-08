// src/core/deviceVault/deviceVaultRegistry.ts
// BOWCON V4.0 — SECURE DEVICE CREDENTIAL VAULT & DURABLE TRUST PERSISTENCE RUNTIME (MS-1.3.25)
//
// 9-tuple scope-isolated in-memory registry for device credential vaults.
// Prevents cross-user, cross-device, cross-session, cross-brain, and cross-surface credential leakage.

import type { DeviceCredentialRecord, VaultEntry } from './deviceVaultTypes.js';
import type { ScopedDeviceIdentity } from '../pairing/pairingTypes.js';
import { areDeviceScopesEqual, createDeviceScope } from '../pairing/pairingScope.js';

export class DeviceVaultRegistry {
  // Key: deviceId -> DeviceCredentialRecord
  private readonly recordsByDeviceId = new Map<string, DeviceCredentialRecord>();

  // Key: `${scopeString}::${deviceId}` -> DeviceCredentialRecord
  private readonly recordsByScopeAndDeviceId = new Map<string, DeviceCredentialRecord>();

  // Key: fingerprint -> DeviceCredentialRecord
  private readonly recordsByFingerprint = new Map<string, DeviceCredentialRecord>();

  // Key: userId -> Set<deviceId>
  private readonly deviceIdsByUserId = new Map<string, Set<string>>();

  // Key: entryId -> VaultEntry
  private readonly entriesById = new Map<string, VaultEntry>();

  private makeScopeKey(scopeString: string, deviceId: string): string {
    return `${scopeString}::${deviceId}`;
  }

  public registerRecord(record: DeviceCredentialRecord): void {
    const scopeKey = this.makeScopeKey(record.scopeString, record.deviceId);
    this.recordsByDeviceId.set(record.deviceId, record);
    this.recordsByScopeAndDeviceId.set(scopeKey, record);
    this.recordsByFingerprint.set(record.trustRecordFingerprint, record);

    let userDevices = this.deviceIdsByUserId.get(record.scope.userId);
    if (!userDevices) {
      userDevices = new Set<string>();
      this.deviceIdsByUserId.set(record.scope.userId, userDevices);
    }
    userDevices.add(record.deviceId);

    for (const entry of record.entries) {
      this.entriesById.set(entry.entryId, entry);
    }
  }

  public getRecordByDeviceId(deviceId: string): DeviceCredentialRecord | undefined {
    return this.recordsByDeviceId.get(deviceId);
  }

  public getRecordByScope(deviceId: string, scope: ScopedDeviceIdentity): DeviceCredentialRecord | undefined {
    const scopeString = createDeviceScope(scope);
    const scopeKey = this.makeScopeKey(scopeString, deviceId);
    const record = this.recordsByScopeAndDeviceId.get(scopeKey);
    if (record && areDeviceScopesEqual(record.scope, scope)) {
      return record;
    }
    return undefined;
  }

  public getRecordByFingerprint(fingerprint: string): DeviceCredentialRecord | undefined {
    return this.recordsByFingerprint.get(fingerprint);
  }

  public getEntry(entryId: string): VaultEntry | undefined {
    return this.entriesById.get(entryId);
  }

  public getDevicesByUser(userId: string): readonly DeviceCredentialRecord[] {
    const deviceIds = this.deviceIdsByUserId.get(userId);
    if (!deviceIds || deviceIds.size === 0) {
      return [];
    }
    const results: DeviceCredentialRecord[] = [];
    for (const id of deviceIds) {
      const rec = this.recordsByDeviceId.get(id);
      if (rec) {
        results.push(rec);
      }
    }
    return Object.freeze(results);
  }

  public removeRecord(deviceId: string): boolean {
    const record = this.recordsByDeviceId.get(deviceId);
    if (!record) {
      return false;
    }

    const scopeKey = this.makeScopeKey(record.scopeString, record.deviceId);
    this.recordsByDeviceId.delete(deviceId);
    this.recordsByScopeAndDeviceId.delete(scopeKey);
    this.recordsByFingerprint.delete(record.trustRecordFingerprint);

    const userDevices = this.deviceIdsByUserId.get(record.scope.userId);
    if (userDevices) {
      userDevices.delete(deviceId);
      if (userDevices.size === 0) {
        this.deviceIdsByUserId.delete(record.scope.userId);
      }
    }

    for (const entry of record.entries) {
      this.entriesById.delete(entry.entryId);
    }

    return true;
  }

  public size(): number {
    return this.recordsByDeviceId.size;
  }

  public clear(): void {
    this.recordsByDeviceId.clear();
    this.recordsByScopeAndDeviceId.clear();
    this.recordsByFingerprint.clear();
    this.deviceIdsByUserId.clear();
    this.entriesById.clear();
  }
}
