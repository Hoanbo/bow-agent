// src/core/deviceIdentity/persistentDeviceAudit.ts
// BOWCON V4.0 — PERSISTENT DEVICE IDENTITY & PASSWORDLESS RECOGNITION RUNTIME (MS-1.3.24)
//
// Immutable audit logging with automated credential and secret scrubbing.
// Invariant: Audits are permanent evidence; secrets are NEVER written to audit records.

import type {
  PersistentDeviceAuditRecord,
  PersistentDeviceAuditEventType,
  PersistentDeviceState,
} from './persistentDeviceTypes.js';
import { computeDeviceDigest, deepFreezeDevice } from './persistentDeviceFingerprint.js';

const SECRET_PATTERNS: readonly RegExp[] = [
  /private/i,
  /secret/i,
  /token/i,
  /password/i,
  /credential/i,
  /bearer/i,
  /authorization/i,
  /signature/i,
];

/**
 * Recursively scrubs sensitive secrets from an arbitrary object.
 * Replaces values of matching sensitive keys with '[REDACTED]'.
 */
export function scrubDeviceSecrets<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => scrubDeviceSecrets(item)) as unknown as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const isSensitive = SECRET_PATTERNS.some((pattern) => pattern.test(key));
    if (isSensitive) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = scrubDeviceSecrets(value);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

export interface RecordDeviceAuditParams {
  readonly eventType: PersistentDeviceAuditEventType;
  readonly deviceId: string;
  readonly scopeString: string;
  readonly keyVersion?: number;
  readonly state?: PersistentDeviceState;
  readonly details?: Record<string, unknown>;
  readonly timestamp?: number;
}

export class PersistentDeviceAuditLedger {
  private readonly records: PersistentDeviceAuditRecord[] = [];
  private sequence = 0;

  /**
   * Records an authoritative, scrubbed audit event.
   */
  public record(params: RecordDeviceAuditParams): PersistentDeviceAuditRecord {
    this.sequence += 1;
    const now = params.timestamp ?? Date.now();
    const cleanDetails = scrubDeviceSecrets(params.details ?? {});

    const auditId = `pdaudit_${computeDeviceDigest({
      eventType: params.eventType,
      deviceId: params.deviceId,
      scopeString: params.scopeString,
      timestamp: now,
      sequence: this.sequence,
    })}`;

    const auditFingerprint = computeDeviceDigest({
      auditId,
      eventType: params.eventType,
      deviceId: params.deviceId,
      scopeString: params.scopeString,
      keyVersion: params.keyVersion ?? 0,
      state: params.state ?? '',
      details: cleanDetails,
      timestamp: now,
      sequence: this.sequence,
    });

    const entry: PersistentDeviceAuditRecord = deepFreezeDevice({
      auditId,
      eventType: params.eventType,
      deviceId: params.deviceId,
      scopeString: params.scopeString,
      keyVersion: params.keyVersion,
      state: params.state,
      details: cleanDetails,
      auditFingerprint,
      timestamp: now,
    });

    this.records.push(entry);
    return entry;
  }

  public getRecords(): readonly PersistentDeviceAuditRecord[] {
    return Object.freeze([...this.records]);
  }

  public getByDeviceId(deviceId: string): readonly PersistentDeviceAuditRecord[] {
    return Object.freeze(this.records.filter((r) => r.deviceId === deviceId));
  }

  public getByEventType(eventType: PersistentDeviceAuditEventType): readonly PersistentDeviceAuditRecord[] {
    return Object.freeze(this.records.filter((r) => r.eventType === eventType));
  }

  public count(): number {
    return this.records.length;
  }

  public clear(): void {
    this.records.length = 0;
    this.sequence = 0;
  }
}
