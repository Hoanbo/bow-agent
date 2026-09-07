// src/core/pairing/pairingTrustRegistry.ts
// BOWCON V4.0 — DEVICE PAIRING & TRUST RUNTIME FOUNDATION (MS-1.3.23)
//
// Observational query interface for device trust and pairing state.
// Invariant: Queries are strictly observational. Zero tool execution, zero Brain mutation.

import type { PairingRecord, TrustRecord, DeviceTrustLevel } from './pairingTypes.js';
import type { PairingRegistry } from './pairingRegistry.js';

export class PairingTrustRegistry {
  private readonly registry: PairingRegistry;

  constructor(registry: PairingRegistry) {
    this.registry = registry;
  }

  /**
   * Checks whether a device is currently paired in the given scope.
   */
  public isDevicePaired(deviceId: string, scopeString: string): boolean {
    const record = this.registry.getPairingRecord(deviceId, scopeString);
    if (!record) {
      return false;
    }
    return (
      (record.pairingState === 'PAIRED' || record.pairingState === 'TRUSTED') &&
      !record.revoked
    );
  }

  /**
   * Checks whether a device has active authoritative trust in the given scope.
   */
  public isDeviceTrusted(deviceId: string, scopeString: string): boolean {
    const record = this.registry.getPairingRecord(deviceId, scopeString);
    if (!record || record.revoked || record.pairingState !== 'TRUSTED') {
      return false;
    }
    const trust = this.registry.getTrustRecord(deviceId, scopeString);
    return trust !== undefined && trust.active && trust.trustLevel === 'TRUSTED';
  }

  /**
   * Retrieves the current DeviceTrustLevel for a device in the given scope.
   */
  public getDeviceTrustLevel(deviceId: string, scopeString: string): DeviceTrustLevel {
    const record = this.registry.getPairingRecord(deviceId, scopeString);
    if (!record) {
      return 'NONE';
    }
    if (record.revoked || record.pairingState === 'REVOKED') {
      return 'REVOKED';
    }
    return record.trustLevel;
  }

  /**
   * Checks whether a device is marked as revoked.
   */
  public isDeviceRevoked(deviceId: string, scopeString: string): boolean {
    return this.registry.isDeviceRevoked(deviceId, scopeString);
  }

  /**
   * Retrieves the PairingRecord for a device in the given scope.
   */
  public getPairingRecord(deviceId: string, scopeString: string): PairingRecord | undefined {
    return this.registry.getPairingRecord(deviceId, scopeString);
  }

  /**
   * Retrieves the TrustRecord for a device in the given scope.
   */
  public getTrustRecord(deviceId: string, scopeString: string): TrustRecord | undefined {
    return this.registry.getTrustRecord(deviceId, scopeString);
  }
}
