// src/core/relay/relayAudit.ts
// BOWCON V4.0 — SECURE ALWAYS-ON BRAIN RELAY & REMOTE SESSION RUNTIME (MS-1.3.27)
//
// Immutable audit ledger with automated secret scrubbing.
//
// INVARIANTS:
// - Audit records are strictly append-only and immutable.
// - Sensitive cryptographic material (keys, tokens, passwords, proofs) is automatically scrubbed.

import type { RelayAuditRecord, RelaySecurityEventType, RelayId, RelaySurfaceType as SurfaceType } from './relayTypes.js';

const SENSITIVE_KEYS = new Set([
  'privatekey',
  'token',
  'credential',
  'secret',
  'password',
  'proof',
  'signature',
  'resumetoken',
  'authkey',
  'apikey',
]);

/**
 * Deeply redacts sensitive keys from audit details.
 */
export function scrubRelayAuditDetails(details: Record<string, unknown>): Record<string, unknown> {
  const scrubbed: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(details)) {
    const lowerKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    let isSensitive = false;
    for (const s of SENSITIVE_KEYS) {
      if (lowerKey.includes(s)) {
        isSensitive = true;
        break;
      }
    }

    if (isSensitive) {
      scrubbed[k] = '[REDACTED_SECRET]';
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      scrubbed[k] = scrubRelayAuditDetails(v as Record<string, unknown>);
    } else {
      scrubbed[k] = v;
    }
  }

  return Object.freeze(scrubbed);
}

export class RelayAuditLedger {
  private readonly records: RelayAuditRecord[] = [];
  private sequence: number = 0;

  public record(params: {
    eventType: RelaySecurityEventType;
    relayId?: RelayId;
    deviceId?: string;
    sessionId?: string;
    surfaceId?: string;
    surfaceType?: SurfaceType;
    details?: Record<string, unknown>;
    timestamp?: number;
  }): RelayAuditRecord {
    this.sequence++;
    const now = params.timestamp ?? Date.now();
    const id = `audit_relay_${now}_${this.sequence}`;

    const cleanDetails = params.details ? scrubRelayAuditDetails(params.details) : Object.freeze({});

    const entry: RelayAuditRecord = Object.freeze({
      id,
      timestamp: now,
      eventType: params.eventType,
      relayId: params.relayId,
      deviceId: params.deviceId,
      sessionId: params.sessionId,
      surfaceId: params.surfaceId,
      surfaceType: params.surfaceType,
      details: cleanDetails,
    });

    this.records.push(entry);
    return entry;
  }

  public getRecords(): readonly RelayAuditRecord[] {
    return Object.freeze([...this.records]);
  }

  public getRecordsForSession(sessionId: string): readonly RelayAuditRecord[] {
    return Object.freeze(this.records.filter((r) => r.sessionId === sessionId));
  }

  public getRecordsByEventType(eventType: RelaySecurityEventType): readonly RelayAuditRecord[] {
    return Object.freeze(this.records.filter((r) => r.eventType === eventType));
  }

  public count(): number {
    return this.records.length;
  }

  public clear(): void {
    this.records.length = 0;
  }
}
