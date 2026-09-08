// src/core/admission/admissionAudit.ts
// BOWCON V4.0 — ZERO-TRUST ALWAYS-ON BRAIN CONNECTIVITY & SECURE INTERNET ADMISSION RUNTIME (MS-1.3.26)
//
// Append-only observational audit ledger with automated secret scrubbing.
// Invariant: NEVER logs raw private keys, passwords, tokens, or raw signatures.

import type { AdmissionSecurityEventType } from './admissionTypes.js';
import { computeDeviceDigest, deepFreezeDevice } from '../deviceIdentity/persistentDeviceFingerprint.js';

export interface AdmissionAuditRecord {
  readonly auditId: string;
  readonly eventType: AdmissionSecurityEventType;
  readonly deviceId: string;
  readonly scopeString?: string;
  readonly details: Readonly<Record<string, unknown>>;
  readonly timestamp: number;
  readonly auditFingerprint: string;
}

const REDACTED_MARKER = '[REDACTED_SECRET]';
export const ADMISSION_REDACTED_MARKER = REDACTED_MARKER;
const SENSITIVE_KEY_PATTERNS = [
  /private/i,
  /secret/i,
  /password/i,
  /token/i,
  /credential/i,
  /signature/i,
  /proofbytes/i,
  /authorization/i,
];

/**
 * Recursively redacts sensitive keys from audit details.
 */
export function scrubAdmissionSecrets(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    if (value.includes('BEGIN PRIVATE KEY') || value.includes('BEGIN EC PRIVATE KEY')) {
      return REDACTED_MARKER;
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => scrubAdmissionSecrets(item));
  }

  if (typeof value === 'object') {
    const output: Record<string, unknown> = {};
    const obj = value as Record<string, unknown>;

    for (const key of Object.keys(obj)) {
      const isSensitive = SENSITIVE_KEY_PATTERNS.some((p) => p.test(key));
      if (isSensitive) {
        output[key] = REDACTED_MARKER;
      } else {
        output[key] = scrubAdmissionSecrets(obj[key]);
      }
    }
    return output;
  }

  return value;
}

export interface RecordAdmissionAuditInput {
  readonly eventType: AdmissionSecurityEventType;
  readonly deviceId: string;
  readonly scopeString?: string;
  readonly details?: Record<string, unknown>;
  readonly timestamp?: number;
}

export class AdmissionAuditLedger {
  private readonly records: AdmissionAuditRecord[] = [];

  public record(input: RecordAdmissionAuditInput): AdmissionAuditRecord {
    const now = input.timestamp ?? Date.now();
    const scrubbedDetails = (scrubAdmissionSecrets(input.details ?? {}) as Record<string, unknown>);

    const auditId = `admaudit_${computeDeviceDigest({
      index: this.records.length,
      eventType: input.eventType,
      deviceId: input.deviceId,
      timestamp: now,
    })}`;

    const auditFingerprint = computeDeviceDigest({
      auditId,
      eventType: input.eventType,
      deviceId: input.deviceId,
      scopeString: input.scopeString,
      details: scrubbedDetails,
      timestamp: now,
    });

    const record: AdmissionAuditRecord = deepFreezeDevice({
      auditId,
      eventType: input.eventType,
      deviceId: input.deviceId,
      scopeString: input.scopeString,
      details: Object.freeze(scrubbedDetails),
      timestamp: now,
      auditFingerprint,
    });

    this.records.push(record);
    return record;
  }

  public list(): readonly AdmissionAuditRecord[] {
    return Object.freeze([...this.records]);
  }

  public getByEventType(type: AdmissionSecurityEventType): readonly AdmissionAuditRecord[] {
    return Object.freeze(this.records.filter((r) => r.eventType === type));
  }

  public getByDeviceId(deviceId: string): readonly AdmissionAuditRecord[] {
    return Object.freeze(this.records.filter((r) => r.deviceId === deviceId));
  }

  public size(): number {
    return this.records.length;
  }

  public clear(): void {
    this.records.length = 0;
  }
}
