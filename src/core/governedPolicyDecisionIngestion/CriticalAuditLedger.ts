import { closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import {
  PolicyHandoffSchemaValidationError,
  computeIngestionAuditHash,
  type IngestionAuditEvent,
  type IngestionAuditEventType,
} from './GovernedPolicyDecisionIngestionTypes.js';

/**
 * Local single-writer evidence ledger. It records governance outcomes but never
 * grants authority. Every load verifies the complete tenant-local hash chain.
 */
export class CriticalAuditLedger {
  private events: IngestionAuditEvent[];
  private readonly ledgerPath: string;

  constructor(ledgerPath = 'data/governance_critical_audit_ledger.json') {
    this.ledgerPath = resolve(ledgerPath);
    this.events = this.loadAndVerify();
  }

  public append(eventType: IngestionAuditEventType, tenantId: string, details: Record<string, unknown>, context: Partial<Omit<IngestionAuditEvent, 'eventId' | 'eventType' | 'tenantId' | 'details' | 'timestamp' | 'prevHash' | 'eventHash'>> = {}): IngestionAuditEvent {
    if (!tenantId || !/^[a-zA-Z0-9_-]{1,64}$/.test(tenantId)) throw new PolicyHandoffSchemaValidationError('AUDIT_TENANT_INVALID');
    const lockPath = this.acquireLock();
    try {
      // Reload after exclusive acquisition so no writer computes from stale state.
      this.events = this.loadAndVerify();
      const prior = this.events.filter((event) => event.tenantId === tenantId).at(-1);
      const draft: Omit<IngestionAuditEvent, 'eventHash'> = {
        eventId: `critical_${tenantId}_${Date.now()}_${this.events.length}`,
        eventType, tenantId, details: JSON.parse(JSON.stringify(details)), timestamp: Date.now(),
        prevHash: prior?.eventHash ?? 'GENESIS', ...context,
      };
      const event = Object.freeze({ ...draft, eventHash: computeIngestionAuditHash(draft) });
      this.events.push(event);
      this.persist();
      return event;
    } finally {
      try { unlinkSync(lockPath); } catch { /* stale lock intentionally halts later writes */ }
    }
  }

  public verify(): void { this.verifyEvents(this.events); }
  public listForTenant(tenantId: string): readonly IngestionAuditEvent[] { return this.events.filter((event) => event.tenantId === tenantId); }

  private loadAndVerify(): IngestionAuditEvent[] {
    if (!existsSync(this.ledgerPath)) return [];
    try {
      const parsed: unknown = JSON.parse(readFileSync(this.ledgerPath, 'utf8'));
      if (!Array.isArray(parsed)) throw new Error('not an array');
      this.verifyEvents(parsed as IngestionAuditEvent[]);
      return parsed as IngestionAuditEvent[];
    } catch {
      throw new PolicyHandoffSchemaValidationError('AUDIT_LEDGER_CORRUPTION_HALT');
    }
  }

  private verifyEvents(events: readonly IngestionAuditEvent[]): void {
    const priorByTenant = new Map<string, string>();
    for (const event of events) {
      const expectedPrevious = priorByTenant.get(event.tenantId) ?? 'GENESIS';
      const { eventHash, ...draft } = event;
      if (event.prevHash !== expectedPrevious || eventHash !== computeIngestionAuditHash(draft)) {
        throw new PolicyHandoffSchemaValidationError('AUDIT_LEDGER_CORRUPTION_HALT');
      }
      priorByTenant.set(event.tenantId, eventHash);
    }
  }

  private persist(): void {
    mkdirSync(dirname(this.ledgerPath), { recursive: true });
    const temporary = `${this.ledgerPath}.${process.pid}.${Date.now()}.tmp`;
    writeFileSync(temporary, JSON.stringify(this.events), { encoding: 'utf8', mode: 0o600 });
    renameSync(temporary, this.ledgerPath);
  }

  private acquireLock(): string {
    const lockPath = `${this.ledgerPath}.lock`;
    mkdirSync(dirname(lockPath), { recursive: true });
    try {
      const descriptor = openSync(lockPath, 'wx', 0o600);
      closeSync(descriptor);
      return lockPath;
    } catch {
      throw new PolicyHandoffSchemaValidationError('AUDIT_LEDGER_LOCK_UNAVAILABLE');
    }
  }
}
