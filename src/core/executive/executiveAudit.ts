// src/core/executive/executiveAudit.ts
// BOWCON V4.0 — MS-1.3.37: REAL BOWCON EXECUTIVE TASK & LONG-HORIZON GOAL ORCHESTRATION RUNTIME
//
// Chained Cryptographic Audit Ledger for Executive Events.
// Enforces tamper-evident append-only hashing and recursive secret scrubbing.

import crypto from 'node:crypto';

export interface ExecutiveAuditEvent {
  readonly auditId: string;
  readonly sequence: number;
  readonly eventType: string;
  readonly entityId: string;
  readonly timestamp: number;
  readonly details: Record<string, unknown>;
  readonly previousHash: string;
  readonly hash: string;
  readonly signature: string;
}

export class ExecutiveAuditLedger {
  private _events: ExecutiveAuditEvent[] = [];
  private _genesisHash = '0000000000000000000000000000000000000000000000000000000000000000';

  /**
   * Recursively sanitizes secrets from arbitrary objects, replacing values with [REDACTED_SECRET].
   */
  public scrubSecrets(obj: unknown): unknown {
    if (typeof obj === 'string') {
      let sanitized = obj;
      // Scrub token_*, sk_*, bearer, passwords, auth secrets
      sanitized = sanitized.replace(/(bearer\s+)[A-Za-z0-9_\-\.]+/gi, '$1[REDACTED_SECRET]');
      sanitized = sanitized.replace(/(token_[a-z0-9_]+)/gi, '[REDACTED_SECRET]');
      sanitized = sanitized.replace(/(sk_[a-zA-Z0-9_\-]+)/gi, '[REDACTED_SECRET]');
      sanitized = sanitized.replace(/("?password"?\s*[:=]\s*)"[^"]+"/gi, '$1"[REDACTED_SECRET]"');
      sanitized = sanitized.replace(/("?secret"?\s*[:=]\s*)"[^"]+"/gi, '$1"[REDACTED_SECRET]"');
      return sanitized;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.scrubSecrets(item));
    }

    if (obj !== null && typeof obj === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey.includes('secret') ||
          lowerKey.includes('password') ||
          lowerKey.includes('token') ||
          lowerKey.includes('credential') ||
          lowerKey.includes('authkey') ||
          lowerKey.includes('apikey') ||
          lowerKey.includes('api_key') ||
          lowerKey.includes('privatekey') ||
          lowerKey.includes('private_key')
        ) {
          result[key] = '[REDACTED_SECRET]';
        } else {
          result[key] = this.scrubSecrets(value);
        }
      }
      return result;
    }

    return obj;
  }

  public record(eventType: string, entityId: string, details: Record<string, unknown> = {}): ExecutiveAuditEvent {
    const sequence = this._events.length;
    const timestamp = Date.now();
    const previousHash = sequence === 0 ? this._genesisHash : this._events[sequence - 1].hash;

    const scrubbedDetails = this.scrubSecrets(details) as Record<string, unknown>;

    const payloadToHash = JSON.stringify({
      sequence,
      eventType,
      entityId,
      timestamp,
      details: scrubbedDetails,
      previousHash,
    });

    const hash = crypto.createHash('sha256').update(payloadToHash).digest('hex');
    const auditId = `audit_${timestamp}_${hash.slice(0, 8)}`;

    const event: ExecutiveAuditEvent = {
      auditId,
      sequence,
      eventType,
      entityId,
      timestamp,
      details: scrubbedDetails,
      previousHash,
      hash,
      signature: hash,
    };

    this._events.push(event);
    return event;
  }

  public getAll(): readonly ExecutiveAuditEvent[] {
    return this._events;
  }

  public getByGoal(goalId: string): ExecutiveAuditEvent[] {
    return this._events.filter(
      (e) => e.entityId === goalId || (e.details as any)?.goalId === goalId
    );
  }

  public get events(): readonly ExecutiveAuditEvent[] {
    return this._events;
  }

  public verifyChain(): { intact: boolean; brokenAt?: number } {
    for (let i = 0; i < this._events.length; i++) {
      const event = this._events[i];
      const expectedPrev = i === 0 ? this._genesisHash : this._events[i - 1].hash;

      if (event.previousHash !== expectedPrev) {
        return { intact: false, brokenAt: i };
      }

      const payloadToHash = JSON.stringify({
        sequence: event.sequence,
        eventType: event.eventType,
        entityId: event.entityId,
        timestamp: event.timestamp,
        details: event.details,
        previousHash: event.previousHash,
      });

      const actualHash = crypto.createHash('sha256').update(payloadToHash).digest('hex');
      if (actualHash !== event.hash) {
        return { intact: false, brokenAt: i };
      }
    }

    return { intact: true };
  }

  public verifyIntegrity(): boolean {
    return this.verifyChain().intact;
  }

  public clear(): void {
    this._events = [];
  }
}

export const globalExecutiveAudit = new ExecutiveAuditLedger();
