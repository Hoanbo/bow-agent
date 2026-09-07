// src/core/pairing/pairingRegistry.ts
// BOWCON V4.0 — DEVICE PAIRING & TRUST RUNTIME FOUNDATION (MS-1.3.23)
//
// In-memory, 9-tuple scope-isolated registry for pairing and trust records.
// Zero filesystem/database dependencies; pure logical state foundation.

import type { PairingRecord, TrustRecord } from './pairingTypes.js';

export class PairingRegistry {
  // Key: pairingId -> PairingRecord
  private readonly pairingsById = new Map<string, PairingRecord>();
  // Key: `${scopeString}::${deviceId}` -> PairingRecord
  private readonly pairingsByScopeAndDevice = new Map<string, PairingRecord>();
  // Key: `${scopeString}::${deviceId}` -> TrustRecord
  private readonly trustByScopeAndDevice = new Map<string, TrustRecord>();
  // Key: `${scopeString}::${deviceId}` -> Revocation metadata
  private readonly revocationsByScopeAndDevice = new Map<
    string,
    { readonly revokedAt: number; readonly reason: string }
  >();

  private makeScopeKey(scopeString: string, deviceId: string): string {
    return `${scopeString}::${deviceId}`;
  }

  /**
   * Registers a new pairing record.
   */
  public registerPairing(record: PairingRecord): void {
    const key = this.makeScopeKey(record.scopeString, record.deviceId);
    this.pairingsById.set(record.pairingId, record);
    this.pairingsByScopeAndDevice.set(key, record);
  }

  /**
   * Retrieves a pairing record by its unique pairingId.
   */
  public getPairing(pairingId: string): PairingRecord | undefined {
    return this.pairingsById.get(pairingId);
  }

  /**
   * Retrieves a pairing record by deviceId and 9-tuple scopeString.
   */
  public getPairingRecord(deviceId: string, scopeString: string): PairingRecord | undefined {
    const key = this.makeScopeKey(scopeString, deviceId);
    return this.pairingsByScopeAndDevice.get(key);
  }

  /**
   * Updates an existing pairing record.
   */
  public updatePairing(record: PairingRecord): void {
    const key = this.makeScopeKey(record.scopeString, record.deviceId);
    this.pairingsById.set(record.pairingId, record);
    this.pairingsByScopeAndDevice.set(key, record);
  }

  /**
   * Stores an authoritative trust record.
   */
  public saveTrustRecord(trust: TrustRecord): void {
    const key = this.makeScopeKey(trust.scopeString, trust.deviceId);
    this.trustByScopeAndDevice.set(key, trust);
  }

  /**
   * Retrieves a trust record by deviceId and scopeString.
   */
  public getTrustRecord(deviceId: string, scopeString: string): TrustRecord | undefined {
    const key = this.makeScopeKey(scopeString, deviceId);
    return this.trustByScopeAndDevice.get(key);
  }

  /**
   * Records authoritative revocation in the registry.
   */
  public recordRevocation(deviceId: string, scopeString: string, reason: string): void {
    const key = this.makeScopeKey(scopeString, deviceId);
    this.revocationsByScopeAndDevice.set(key, {
      revokedAt: Date.now(),
      reason,
    });
  }

  /**
   * Checks whether a device is marked as revoked in this scope.
   */
  public isDeviceRevoked(deviceId: string, scopeString: string): boolean {
    const key = this.makeScopeKey(scopeString, deviceId);
    if (this.revocationsByScopeAndDevice.has(key)) {
      return true;
    }
    const pairing = this.pairingsByScopeAndDevice.get(key);
    if (pairing && (pairing.revoked || pairing.pairingState === 'REVOKED')) {
      return true;
    }
    const trust = this.trustByScopeAndDevice.get(key);
    if (trust && (trust.trustLevel === 'REVOKED' || !trust.active)) {
      return true;
    }
    return false;
  }

  /**
   * Lists all pairing records, optionally filtered by scope string prefix.
   */
  public listPairings(scopeFilter?: string): readonly PairingRecord[] {
    const records = Array.from(this.pairingsById.values());
    if (!scopeFilter) {
      return Object.freeze(records);
    }
    return Object.freeze(records.filter((r) => r.scopeString.startsWith(scopeFilter)));
  }

  /**
   * Lists all trust records, optionally filtered by scope string prefix.
   */
  public listTrustRecords(scopeFilter?: string): readonly TrustRecord[] {
    const records = Array.from(this.trustByScopeAndDevice.values());
    if (!scopeFilter) {
      return Object.freeze(records);
    }
    return Object.freeze(records.filter((r) => r.scopeString.startsWith(scopeFilter)));
  }

  /**
   * Clears all entries in the registry.
   */
  public clear(): void {
    this.pairingsById.clear();
    this.pairingsByScopeAndDevice.clear();
    this.trustByScopeAndDevice.clear();
    this.revocationsByScopeAndDevice.clear();
  }
}
