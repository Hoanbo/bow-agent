// src/core/connection/connectionAudit.ts
// BOWCON V4.0 — REAL BIDIRECTIONAL SECURE CONNECTION & SESSION RUNTIME (MS-1.3.22)
//
// Immutable connection audit records with automatic secret scrubbing and deterministic fingerprinting.

import type { ScopedConnectionIdentity, ConnectionAuditEventType } from './connectionTypes.js';
import { createConnectionScope, deepFreeze, scrubConnectionSecrets } from './connectionScope.js';
import { computeConnectionFingerprint } from './connectionFingerprint.js';

export interface ConnectionAuditRecord {
  readonly auditId: string;
  readonly scope: string;
  readonly eventType: ConnectionAuditEventType;
  readonly details: Readonly<Record<string, unknown>>;
  readonly timestamp: string;
  readonly fingerprint: string;
}

/**
 * Creates an immutable ConnectionAuditRecord
 */
export function createConnectionAuditRecord(
  identity: ScopedConnectionIdentity,
  eventType: ConnectionAuditEventType,
  rawDetails: Record<string, unknown> = {},
  timestamp = new Date().toISOString()
): Readonly<ConnectionAuditRecord> {
  const scope = createConnectionScope(identity);
  const scrubbedDetails = scrubConnectionSecrets(rawDetails);

  const fp = computeConnectionFingerprint({
    scope,
    eventType,
    details: scrubbedDetails,
  });

  return deepFreeze({
    auditId: `caud_${fp}`,
    scope,
    eventType,
    details: deepFreeze({ ...scrubbedDetails }),
    timestamp,
    fingerprint: fp,
  });
}

/**
 * In-memory audit ledger for connection sessions
 */
export class ConnectionAuditLedger {
  private readonly records: ConnectionAuditRecord[] = [];

  public record(audit: ConnectionAuditRecord): void {
    this.records.push(audit);
  }

  public getRecords(scope?: string): readonly ConnectionAuditRecord[] {
    if (!scope) return Object.freeze([...this.records]);
    return Object.freeze(this.records.filter((r) => r.scope === scope));
  }

  public clear(): void {
    this.records.length = 0;
  }
}
