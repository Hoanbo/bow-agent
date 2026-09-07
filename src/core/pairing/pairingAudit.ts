// src/core/pairing/pairingAudit.ts
// BOWCON V4.0 — DEVICE PAIRING & TRUST RUNTIME FOUNDATION (MS-1.3.23)
//
// Immutable audit logging with automatic credential scrubbing.
// Invariant: Audits are permanent evidence; secrets are NEVER written to audit records.

import type {
  PairingAuditRecord,
  PairingAuditEventType,
  PairingState,
  DeviceTrustLevel,
} from './pairingTypes.js';
import { deepFreeze, computePairingDigest } from './pairingFingerprint.js';
import { generateAuditId } from './pairingIdentity.js';
import { scrubSecrets } from './pairingScope.js';

export interface RecordAuditParams {
  readonly eventType: PairingAuditEventType;
  readonly deviceId: string;
  readonly scopeString: string;
  readonly pairingId?: string;
  readonly pairingState?: PairingState;
  readonly trustLevel?: DeviceTrustLevel;
  readonly details: Record<string, unknown>;
  readonly timestamp?: number;
}

export class PairingAuditLedger {
  private readonly records: PairingAuditRecord[] = [];
  private sequence = 0;

  /**
   * Records an authoritative, scrubbed audit event.
   */
  public record(params: RecordAuditParams): PairingAuditRecord {
    this.sequence += 1;
    const now = params.timestamp ?? Date.now();
    const auditId = generateAuditId(params.eventType, params.deviceId, now, this.sequence);
    const cleanDetails = scrubSecrets(params.details);

    const auditFingerprint = computePairingDigest({
      auditId,
      eventType: params.eventType,
      deviceId: params.deviceId,
      scopeString: params.scopeString,
      pairingId: params.pairingId ?? '',
      pairingState: params.pairingState ?? '',
      trustLevel: params.trustLevel ?? '',
      details: cleanDetails,
      timestamp: now,
      sequence: this.sequence,
    });

    const entry: PairingAuditRecord = {
      auditId,
      eventType: params.eventType,
      deviceId: params.deviceId,
      pairingId: params.pairingId,
      scopeString: params.scopeString,
      pairingState: params.pairingState,
      trustLevel: params.trustLevel,
      details: Object.freeze(cleanDetails),
      auditFingerprint,
      timestamp: now,
    };

    const frozen = deepFreeze(entry);
    this.records.push(frozen);
    return frozen;
  }

  /**
   * Retrieves all audit records, optionally filtered by scope string prefix.
   */
  public getRecords(scopeFilter?: string): readonly PairingAuditRecord[] {
    if (!scopeFilter) {
      return Object.freeze([...this.records]);
    }
    return Object.freeze(this.records.filter((r) => r.scopeString.startsWith(scopeFilter)));
  }

  /**
   * Retrieves audit records for a specific device.
   */
  public getRecordsByDevice(deviceId: string): readonly PairingAuditRecord[] {
    return Object.freeze(this.records.filter((r) => r.deviceId === deviceId));
  }

  /**
   * Returns total audit entries count.
   */
  public get count(): number {
    return this.records.length;
  }

  /**
   * Clears audit ledger (for testing teardown only).
   */
  public clear(): void {
    this.records.length = 0;
    this.sequence = 0;
  }
}
