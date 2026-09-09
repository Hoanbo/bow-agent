// src/core/agent-loop/agentLoopAudit.ts
// BOWCON V4.0 — MS-1.3.36: REAL BOWCON CONTINUOUS AGENT OPERATING LOOP & CONTROLLED AUTONOMY RUNTIME
//
// Chained Append-Only Audit Ledger.
//
// Invariants:
// APPEND-ONLY LEDGER
// CHAINED SHA-256 PREVIOUS_HASH INTEGRITY
// RECURSIVE SECRET REDACTION ([REDACTED_SECRET])

import crypto from 'node:crypto';

export type LoopAuditEventType =
  | 'OBJECTIVE_CREATED'
  | 'OBSERVATION_CREATED'
  | 'REASONING_COMPLETED'
  | 'PLAN_CREATED'
  | 'GOVERNANCE_EVALUATED'
  | 'AUTHORIZATION_REQUESTED'
  | 'AUTHORIZATION_GRANTED'
  | 'AUTHORIZATION_DENIED'
  | 'ACTION_STARTED'
  | 'ACTION_VERIFIED'
  | 'ACTION_FAILED'
  | 'RECOVERY_STARTED'
  | 'RECOVERY_VERIFIED'
  | 'ESCALATION_CREATED'
  | 'USER_PAUSED'
  | 'USER_RESUMED'
  | 'USER_STOPPED'
  | 'RUNTIME_RESET'
  | 'RUNTIME_RESTARTED';

export interface LoopAuditEntry {
  readonly auditId: string;
  readonly timestamp: number;
  readonly eventType: LoopAuditEventType;
  readonly payload: Record<string, any>;
  readonly previousHash: string;
  readonly payloadHash: string;
}

export class AgentLoopAuditLedger {
  private readonly ledger: LoopAuditEntry[] = [];
  private lastHash: string = '0'.repeat(64);

  private redactSecrets(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => this.redactSecrets(item));

    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (/key|token|secret|password|auth|credential/i.test(key)) {
        clean[key] = '[REDACTED_SECRET]';
      } else if (typeof value === 'object' && value !== null) {
        clean[key] = this.redactSecrets(value);
      } else {
        clean[key] = value;
      }
    }
    return clean;
  }

  public record(
    eventType: LoopAuditEventType,
    payload: Record<string, any>
  ): LoopAuditEntry {
    const auditId = `laudit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const timestamp = Date.now();
    const scrubbedPayload = this.redactSecrets(payload);
    const payloadHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(scrubbedPayload))
      .digest('hex');

    const entry: LoopAuditEntry = {
      auditId,
      timestamp,
      eventType,
      payload: scrubbedPayload,
      previousHash: this.lastHash,
      payloadHash,
    };

    this.lastHash = crypto
      .createHash('sha256')
      .update(this.lastHash + payloadHash + timestamp.toString())
      .digest('hex');

    this.ledger.push(entry);
    return entry;
  }

  public getEntries(): readonly LoopAuditEntry[] {
    return this.ledger;
  }

  public verifyChainIntegrity(): boolean {
    let currentPrev = '0'.repeat(64);

    for (const entry of this.ledger) {
      if (entry.previousHash !== currentPrev) {
        return false;
      }
      currentPrev = crypto
        .createHash('sha256')
        .update(currentPrev + entry.payloadHash + entry.timestamp.toString())
        .digest('hex');
    }
    return true;
  }

  public clear(): void {
    this.ledger.length = 0;
    this.lastHash = '0'.repeat(64);
  }
}

export const globalAgentLoopAudit = new AgentLoopAuditLedger();
