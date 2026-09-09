// src/core/supervisor/supervisorAudit.ts
// BOWCON V4.0 — MS-1.3.35: REAL BOWCON SUPERVISORY AUTONOMOUS RECOVERY & HUMAN GOVERNANCE RUNTIME
//
// Supervisory Append-Only Chained Audit Ledger with recursive secret redaction.
//
// INVARIANTS:
// Chained SHA-256 hash integrity.
// Never log unredacted secrets or private credentials.

import crypto from 'node:crypto';

export type SupervisorAuditEventType =
  | 'OBSERVATION_RECORDED'
  | 'ANOMALY_DETECTED'
  | 'DIAGNOSIS_CREATED'
  | 'RECOVERY_PLANNED'
  | 'POLICY_EVALUATED'
  | 'HUMAN_GATE_CREATED'
  | 'AUTHORIZATION_RECEIVED'
  | 'AUTHORIZATION_DENIED'
  | 'RECOVERY_STARTED'
  | 'RECOVERY_ATTEMPTED'
  | 'RECOVERY_VERIFIED'
  | 'RECOVERY_FAILED'
  | 'ROLLBACK_STARTED'
  | 'ROLLBACK_VERIFIED'
  | 'ESCALATED'
  | 'SAFE_STOP'
  | 'OPERATOR_RESET'
  | 'RUNTIME_RESUME';

export interface SupervisorAuditEntry {
  readonly eventId: string;
  readonly eventType: SupervisorAuditEventType;
  readonly timestamp: string;
  readonly payload: Record<string, any>;
  readonly payloadHash: string;
  readonly previousHash: string;
}

export class SupervisorAuditLogger {
  private entries: SupervisorAuditEntry[] = [];
  private lastHash: string = '0'.repeat(64);

  public record(eventType: SupervisorAuditEventType, payload: Record<string, any> = {}): SupervisorAuditEntry {
    const scrubbed = this.scrub(payload);
    const eventId = `sup_audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const timestamp = new Date().toISOString();
    const payloadJson = JSON.stringify(scrubbed);
    const payloadHash = crypto.createHash('sha256').update(payloadJson).digest('hex');

    const entryHash = crypto
      .createHash('sha256')
      .update(`${eventId}:${eventType}:${this.lastHash}:${payloadHash}`)
      .digest('hex');

    const entry: SupervisorAuditEntry = {
      eventId,
      eventType,
      timestamp,
      payload: scrubbed,
      payloadHash,
      previousHash: this.lastHash,
    };

    this.lastHash = entryHash;
    this.entries.push(entry);
    return entry;
  }

  public getAllEntries(): readonly SupervisorAuditEntry[] {
    return this.entries;
  }

  public scrub(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') {
      return obj
        .replace(/(bearer\s+)[a-zA-Z0-9_\-\.]{10,}/gi, '$1[REDACTED_SECRET]')
        .replace(/(token=)[a-zA-Z0-9_\-\.]{10,}/gi, '$1[REDACTED_SECRET]')
        .replace(/(api[_-]?key[=:\s]+)[a-zA-Z0-9_\-]{10,}/gi, '$1[REDACTED_SECRET]');
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this.scrub(item));
    }
    if (typeof obj === 'object') {
      const scrubbed: Record<string, any> = {};
      const sensitiveKeys = ['secret', 'token', 'password', 'key', 'auth', 'signature', 'private', 'bearer'];
      for (const [k, v] of Object.entries(obj)) {
        if (sensitiveKeys.some(sk => k.toLowerCase().includes(sk))) {
          scrubbed[k] = '[REDACTED_SECRET]';
        } else {
          scrubbed[k] = this.scrub(v);
        }
      }
      return scrubbed;
    }
    return obj;
  }

  public clear(): void {
    this.entries = [];
    this.lastHash = '0'.repeat(64);
  }
}

export const globalSupervisorAudit = new SupervisorAuditLogger();
