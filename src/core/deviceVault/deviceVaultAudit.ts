// src/core/deviceVault/deviceVaultAudit.ts
// BOWCON V4.0 — SECURE DEVICE CREDENTIAL VAULT & DURABLE TRUST PERSISTENCE RUNTIME (MS-1.3.25)
//
// Append-only audit ledger with automated secret scrubbing.
// Invariant: Observational only. NEVER logs raw private keys or tokens.

import { computeVaultDigest, deepFreezeVault } from './deviceVaultFingerprint.js';

export type DeviceVaultAuditEventType =
  | 'VAULT_INITIALIZED'
  | 'VAULT_LOCKED'
  | 'VAULT_UNLOCKED'
  | 'VAULT_ENTRY_SAVED'
  | 'VAULT_ENTRY_LOADED'
  | 'VAULT_ENTRY_DELETED'
  | 'VAULT_INTEGRITY_CHECKED'
  | 'VAULT_INTEGRITY_FAILED'
  | 'VAULT_RECOVERED'
  | 'VAULT_MIGRATED'
  | 'VAULT_KEY_ROTATED'
  | 'VAULT_DEVICE_REVOKED'
  | 'VAULT_TRANSACTION_COMMITTED'
  | 'VAULT_TRANSACTION_ABORTED';

export const ALL_VAULT_AUDIT_EVENT_TYPES: readonly DeviceVaultAuditEventType[] = Object.freeze([
  'VAULT_INITIALIZED',
  'VAULT_LOCKED',
  'VAULT_UNLOCKED',
  'VAULT_ENTRY_SAVED',
  'VAULT_ENTRY_LOADED',
  'VAULT_ENTRY_DELETED',
  'VAULT_INTEGRITY_CHECKED',
  'VAULT_INTEGRITY_FAILED',
  'VAULT_RECOVERED',
  'VAULT_MIGRATED',
  'VAULT_KEY_ROTATED',
  'VAULT_DEVICE_REVOKED',
  'VAULT_TRANSACTION_COMMITTED',
  'VAULT_TRANSACTION_ABORTED',
]);

export interface DeviceVaultAuditRecord {
  readonly auditId: string;
  readonly eventType: DeviceVaultAuditEventType;
  readonly vaultId: string;
  readonly deviceId?: string;
  readonly scopeString?: string;
  readonly timestamp: number;
  readonly details: Readonly<Record<string, unknown>>;
  readonly auditFingerprint: string;
}

const REDACTED_MARKER = '[REDACTED_VAULT_SECRET]';
const SENSITIVE_KEY_PATTERNS = [
  /private/i,
  /secret/i,
  /password/i,
  /token/i,
  /credential/i,
  /proofsignature/i,
  /signature/i,
];

/**
 * Recursively redacts sensitive keys from audit details and error payloads.
 */
export function scrubVaultSecrets(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    // Redact raw PEM key strings if accidentally passed
    if (value.includes('BEGIN PRIVATE KEY') || value.includes('BEGIN EC PRIVATE KEY')) {
      return REDACTED_MARKER;
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => scrubVaultSecrets(item));
  }

  if (typeof value === 'object') {
    const output: Record<string, unknown> = {};
    const obj = value as Record<string, unknown>;

    for (const key of Object.keys(obj)) {
      const isSensitive = SENSITIVE_KEY_PATTERNS.some((p) => p.test(key));
      if (isSensitive) {
        output[key] = REDACTED_MARKER;
      } else {
        output[key] = scrubVaultSecrets(obj[key]);
      }
    }
    return output;
  }

  return value;
}

export interface RecordAuditEventInput {
  readonly eventType: DeviceVaultAuditEventType;
  readonly vaultId: string;
  readonly deviceId?: string;
  readonly scopeString?: string;
  readonly details?: Record<string, unknown>;
  readonly timestamp?: number;
}

export class DeviceVaultAuditLedger {
  private readonly records: DeviceVaultAuditRecord[] = [];

  public record(input: RecordAuditEventInput): DeviceVaultAuditRecord {
    const now = input.timestamp ?? Date.now();
    const scrubbedDetails = (scrubVaultSecrets(input.details ?? {}) as Record<string, unknown>);

    const auditId = `vaudit_${computeVaultDigest({
      index: this.records.length,
      eventType: input.eventType,
      vaultId: input.vaultId,
      now,
    })}`;

    const auditFingerprint = computeVaultDigest({
      auditId,
      eventType: input.eventType,
      vaultId: input.vaultId,
      deviceId: input.deviceId,
      timestamp: now,
      details: scrubbedDetails,
    });

    const record: DeviceVaultAuditRecord = deepFreezeVault({
      auditId,
      eventType: input.eventType,
      vaultId: input.vaultId,
      deviceId: input.deviceId,
      scopeString: input.scopeString,
      timestamp: now,
      details: Object.freeze(scrubbedDetails),
      auditFingerprint,
    });

    this.records.push(record);
    return record;
  }

  public list(): readonly DeviceVaultAuditRecord[] {
    return Object.freeze([...this.records]);
  }

  public getByVaultId(vaultId: string): readonly DeviceVaultAuditRecord[] {
    return Object.freeze(this.records.filter((r) => r.vaultId === vaultId));
  }

  public getByDeviceId(deviceId: string): readonly DeviceVaultAuditRecord[] {
    return Object.freeze(this.records.filter((r) => r.deviceId === deviceId));
  }

  public getByEventType(type: DeviceVaultAuditEventType): readonly DeviceVaultAuditRecord[] {
    return Object.freeze(this.records.filter((r) => r.eventType === type));
  }

  public size(): number {
    return this.records.length;
  }

  public clear(): void {
    this.records.length = 0;
  }
}
