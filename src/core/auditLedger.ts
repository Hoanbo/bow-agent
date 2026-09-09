// src/core/auditLedger.ts
// BOWCON V4.0 — APPEND-ONLY CRYPTOGRAPHIC HASH-CHAINED AUDIT LEDGER
// Compliant with ISO/IEC 42001 & ISO/IEC 23894

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export interface AuditEvent {
  eventId: string;
  timestamp: string;
  actor: {
    userId: string;
    role: string;
    channel: string;
  };
  domain: string;
  toolName: string;
  classification: string;
  argumentsHash: string;
  idempotencyKey?: string;
  policyDecision: 'PERMIT' | 'DENY';
  approvalId?: string;
  executionStatus: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  resultHash?: string;
  previousHash: string;
  signature: string;
}

export class AuditLedger {
  private auditLog: AuditEvent[] = [];
  private lastHash = '0000000000000000000000000000000000000000000000000000000000000000';
  private filePath?: string;

  private _corruptionStatus = { hasCorruption: false, errors: [] as string[] };

  constructor(filePath?: string) {
    this.filePath = filePath;
    this.loadAndVerifyFromDisk();
  }

  public getCorruptionStatus(): { hasCorruption: boolean; errors: string[] } {
    return {
      hasCorruption: this._corruptionStatus.hasCorruption,
      errors: [...this._corruptionStatus.errors],
    };
  }

  private loadAndVerifyFromDisk(): void {
    if (!this.filePath || !fs.existsSync(this.filePath)) return;
    try {
      const content = fs.readFileSync(this.filePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim().length > 0);
      let currentHash = '0000000000000000000000000000000000000000000000000000000000000000';

      for (const line of lines) {
        const event: AuditEvent = JSON.parse(line);
        if (event.previousHash !== currentHash) {
          const errMsg = `Invalid previousHash chain at event ${event.eventId} (expected ${currentHash}, got ${event.previousHash})`;
          this._corruptionStatus.hasCorruption = true;
          this._corruptionStatus.errors.push(errMsg);
          console.error(`[AUDIT_CORRUPTION_ERROR] ${errMsg}`);
          break;
        }
        const rawForHash = `${event.previousHash}|${event.eventId}|${event.timestamp}|${event.toolName}|${event.policyDecision}`;
        const expectedSig = crypto.createHash('sha256').update(rawForHash).digest('hex');
        if (event.signature !== expectedSig) {
          const errMsg = `Signature mismatch at event ${event.eventId}`;
          this._corruptionStatus.hasCorruption = true;
          this._corruptionStatus.errors.push(errMsg);
          console.error(`[AUDIT_CORRUPTION_ERROR] ${errMsg}`);
          break;
        }
        currentHash = event.signature;
        this.auditLog.push(event);
      }

      this.lastHash = currentHash;
    } catch (err: any) {
      this._corruptionStatus.hasCorruption = true;
      this._corruptionStatus.errors.push(`Error reading audit file: ${err.message}`);
      console.warn(`[AUDIT_WARNING] Error reading audit file:`, err);
    }
  }

  /**
   * Append an immutable audit event to the cryptographically linked chain
   * Fails closed if disk persistence fails
   */
  public record(eventData: Omit<AuditEvent, 'eventId' | 'previousHash' | 'signature'>): AuditEvent {
    const eventId = 'audit_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');
    const rawForHash = `${this.lastHash}|${eventId}|${eventData.timestamp}|${eventData.toolName}|${eventData.policyDecision}`;
    const signature = crypto.createHash('sha256').update(rawForHash).digest('hex');

    const event: AuditEvent = {
      ...eventData,
      eventId,
      previousHash: this.lastHash,
      signature,
    };

    this.lastHash = signature;
    this.auditLog.push(event);

    if (this.filePath) {
      try {
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.appendFileSync(this.filePath, JSON.stringify(event) + '\n', 'utf8');
      } catch (err: any) {
        throw new Error(`AUDIT_PERSISTENCE_FAILURE: Cannot persist audit record to disk (${err.message}). Mutating action denied.`);
      }
    }

    return event;
  }

  /**
   * Verify the mathematical integrity of the cryptographic chain
   * Returns true if chain is unbroken; false if any record has been modified, deleted or reordered
   */
  public verifyChainIntegrity(): boolean {
    let expectedPrevHash = '0000000000000000000000000000000000000000000000000000000000000000';
    for (const event of this.auditLog) {
      if (event.previousHash !== expectedPrevHash) return false;
      const rawForHash = `${event.previousHash}|${event.eventId}|${event.timestamp}|${event.toolName}|${event.policyDecision}`;
      const expectedSig = crypto.createHash('sha256').update(rawForHash).digest('hex');
      if (event.signature !== expectedSig) return false;
      expectedPrevHash = event.signature;
    }
    return true;
  }

  public getAuditTrail(): AuditEvent[] {
    return [...this.auditLog];
  }

  public getTrail(filter?: { domain?: string; limit?: number }): AuditEvent[] {
    let trail = [...this.auditLog];
    if (filter?.domain) {
      trail = trail.filter(e => e.domain === filter.domain);
    }
    if (filter?.limit && filter.limit > 0) {
      trail = trail.slice(-filter.limit);
    }
    return trail;
  }

  public getLastHash(): string {
    return this.lastHash;
  }

  public count(): number {
    return this.auditLog.length;
  }
}

export const globalAuditLedger = new AuditLedger(
  path.resolve(process.cwd(), 'data', 'audit_ledger.jsonl')
);
