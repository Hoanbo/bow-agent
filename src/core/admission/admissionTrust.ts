// src/core/admission/admissionTrust.ts
// BOWCON V4.0 — ZERO-TRUST ALWAYS-ON BRAIN CONNECTIVITY & SECURE INTERNET ADMISSION RUNTIME (MS-1.3.26)
//
// Bridge to persistent device trust runtime (MS-1.3.24 / MS-1.3.25).
// Invariant: AUTHENTICATED != TRUSTED != AUTHORIZED != EXECUTED.

import type { PersistentDeviceTrustRecord } from '../deviceIdentity/persistentDeviceTypes.js';
import type { ScopedDeviceIdentity } from '../pairing/pairingTypes.js';

export interface AdmissionTrustEvaluationResult {
  readonly trusted: boolean;
  readonly failureCode?: string;
  readonly failureReason?: string;
  readonly record?: PersistentDeviceTrustRecord;
}

export interface AdmissionTrustProvider {
  getTrustRecord(deviceId: string, scope: ScopedDeviceIdentity): PersistentDeviceTrustRecord | undefined;
}

/**
 * In-memory trust provider implementation for deterministic testing and runtime integration.
 */
export class InMemoryAdmissionTrustProvider implements AdmissionTrustProvider {
  private readonly records = new Map<string, PersistentDeviceTrustRecord>();

  public register(record: PersistentDeviceTrustRecord): void {
    this.records.set(record.deviceId, record);
  }

  public getTrustRecord(deviceId: string, _scope: ScopedDeviceIdentity): PersistentDeviceTrustRecord | undefined {
    return this.records.get(deviceId);
  }

  public clear(): void {
    this.records.clear();
  }
}

export function evaluateAdmissionTrust(
  deviceId: string,
  recordOrScope: PersistentDeviceTrustRecord | undefined | ScopedDeviceIdentity,
  providerOrNow?: AdmissionTrustProvider | number,
  now: number = Date.now()
): AdmissionTrustEvaluationResult {
  let record: PersistentDeviceTrustRecord | undefined;
  let effectiveNow = now;

  if (typeof providerOrNow === 'number') {
    effectiveNow = providerOrNow;
  }

  if (providerOrNow && typeof (providerOrNow as any).getTrustRecord === 'function') {
    record = (providerOrNow as AdmissionTrustProvider).getTrustRecord(deviceId, recordOrScope as ScopedDeviceIdentity);
  } else {
    record = recordOrScope as PersistentDeviceTrustRecord | undefined;
  }

  if (!record) {
    return {
      trusted: false,
      failureCode: 'ADMISSION_DEVICE_NOT_FOUND',
      failureReason: `No persistent trust record found for device ${deviceId}.`,
    };
  }

  // 1. Check revocation
  if (record.revoked || record.lifecycleState === 'REVOKED') {
    return {
      trusted: false,
      failureCode: 'ADMISSION_DEVICE_REVOKED',
      failureReason: `Device ${deviceId} is permanently revoked.`,
      record,
    };
  }

  // 2. Check expiration
  if (record.expiresAt && now > record.expiresAt) {
    return {
      trusted: false,
      failureCode: 'ADMISSION_TRUST_EXPIRED',
      failureReason: `Trust record for device ${deviceId} expired at ${record.expiresAt}.`,
      record,
    };
  }

  // 3. Check trust level
  if (record.trustLevel !== 'TRUSTED' && record.trustLevel !== 'PAIRED') {
    return {
      trusted: false,
      failureCode: 'ADMISSION_TRUST_INSUFFICIENT',
      failureReason: `Device ${deviceId} has insufficient trust level: ${record.trustLevel}.`,
      record,
    };
  }

  return {
    trusted: true,
    record,
  };
}

export function assertAdmissionTrust(result: AdmissionTrustEvaluationResult): void {
  if (!result.trusted) {
    throw new Error(`[${result.failureCode || 'ADMISSION_TRUST_FAILED'}] ${result.failureReason || 'Admission trust evaluation failed. Fail-closed.'}`);
  }
}

