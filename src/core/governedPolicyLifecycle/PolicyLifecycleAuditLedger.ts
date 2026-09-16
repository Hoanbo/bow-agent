// src/core/governedPolicyLifecycle/PolicyLifecycleAuditLedger.ts
// Component 1186: PolicyLifecycleAuditLedger (REAL)
//
// Append-only cryptographic operational audit ledger.
// Enforces unbroken SHA-256 hash chaining, tenant isolation, automatic secret scrubbing,
// and tamper verification across 32 operational lifecycle event types.

import * as fs from 'fs';
import * as path from 'path';
import {
  type PolicyLifecycleAuditEvent,
  type LifecycleAuditEventType,
  GENESIS_PREV_HASH,
  computeLifecycleAuditHash,
  deepFreeze,
  canonicalJsonStringify,
  PolicyLifecycleAuditIntegrityError,
  PolicyLifecycleTenantIsolationError,
} from './GovernedPolicyLifecycleTypes.js';

export interface AuditEventParams {
  eventType: LifecycleAuditEventType;
  tenantId: string;
  policyDomain?: any;
  policyId?: string;
  policyVersion?: number;
  lifecycleVersion?: number;
  fromState?: any;
  toState?: any;
  operatorId?: string;
  details?: Record<string, unknown>;
}

export class PolicyLifecycleAuditLedger {
  private readonly ledgerStore = new Map<string, PolicyLifecycleAuditEvent[]>(); // tenantId -> events
  private readonly ledgerBasePath: string;

  constructor(customBasePath?: string) {
    this.ledgerBasePath = customBasePath || path.resolve(process.cwd(), 'data', 'partitions_governed_policy_lifecycle');
  }

  /**
   * Append an immutable, hash-chained operational audit event.
   */
  public recordEvent(params: AuditEventParams): PolicyLifecycleAuditEvent {
    this.validateTenant(params.tenantId);

    const tenantEvents = this.ledgerStore.get(params.tenantId) || [];
    const prevHash = tenantEvents.length > 0 ? tenantEvents[tenantEvents.length - 1].eventHash : GENESIS_PREV_HASH;

    // Sanitize details: scrub any keys that may contain secret tokens or passwords
    const sanitizedDetails = this.scrubSecrets(params.details || {});

    const eventId = `aud_${params.tenantId}_${Date.now()}_${tenantEvents.length + 1}`;
    const timestamp = Date.now();

    const rawEvent: Omit<PolicyLifecycleAuditEvent, 'eventHash'> = {
      eventId,
      eventType: params.eventType,
      tenantId: params.tenantId,
      policyDomain: params.policyDomain,
      policyId: params.policyId,
      policyVersion: params.policyVersion,
      lifecycleVersion: params.lifecycleVersion,
      fromState: params.fromState,
      toState: params.toState,
      operatorId: params.operatorId,
      details: sanitizedDetails,
      timestamp,
      prevHash,
    };

    const eventHash = computeLifecycleAuditHash(prevHash, rawEvent);
    const frozenEvent: PolicyLifecycleAuditEvent = deepFreeze({
      ...rawEvent,
      eventHash,
    });

    tenantEvents.push(frozenEvent);
    this.ledgerStore.set(params.tenantId, tenantEvents);

    // Append to tenant's JSONL on disk
    this.appendToFile(params.tenantId, frozenEvent);

    return frozenEvent;
  }

  /**
   * Verify the cryptographic hash chain of the ledger for a tenant.
   */
  public verifyLedgerIntegrity(tenantId: string): { verified: boolean; eventCount: number; error?: string } {
    this.validateTenant(tenantId);
    const events = this.ledgerStore.get(tenantId) || [];

    if (events.length === 0) {
      return { verified: true, eventCount: 0 };
    }

    let expectedPrevHash = GENESIS_PREV_HASH;

    for (let i = 0; i < events.length; i++) {
      const ev = events[i];

      // 1. Verify prevHash link
      if (ev.prevHash !== expectedPrevHash) {
        return {
          verified: false,
          eventCount: i,
          error: `BROKEN_HASH_CHAIN: Event index ${i} ('${ev.eventId}') expected prevHash '${expectedPrevHash}', but has '${ev.prevHash}'.`,
        };
      }

      // 2. Verify eventHash
      const calculatedHash = computeLifecycleAuditHash(ev.prevHash, {
        eventId: ev.eventId,
        eventType: ev.eventType,
        tenantId: ev.tenantId,
        policyDomain: ev.policyDomain,
        policyId: ev.policyId,
        policyVersion: ev.policyVersion,
        lifecycleVersion: ev.lifecycleVersion,
        fromState: ev.fromState,
        toState: ev.toState,
        operatorId: ev.operatorId,
        details: ev.details,
        timestamp: ev.timestamp,
      });

      if (ev.eventHash !== calculatedHash) {
        return {
          verified: false,
          eventCount: i,
          error: `CORRUPTED_EVENT_HASH: Event index ${i} ('${ev.eventId}') has tampered payload or invalid hash.`,
        };
      }

      expectedPrevHash = ev.eventHash;
    }

    return { verified: true, eventCount: events.length };
  }

  public getEvents(tenantId: string): readonly PolicyLifecycleAuditEvent[] {
    this.validateTenant(tenantId);
    const events = this.ledgerStore.get(tenantId) || [];
    return Object.freeze([...events]);
  }

  private appendToFile(tenantId: string, event: PolicyLifecycleAuditEvent): void {
    const auditDir = path.join(this.ledgerBasePath, tenantId, 'audit');
    if (!fs.existsSync(auditDir)) {
      fs.mkdirSync(auditDir, { recursive: true });
    }

    const filePath = path.join(auditDir, 'operational_lifecycle_audit.jsonl');
    const line = canonicalJsonStringify(event) + '\n';
    fs.appendFileSync(filePath, line, 'utf8');
  }

  private scrubSecrets(details: Record<string, unknown>): Record<string, unknown> {
    const sensitiveKeys = ['secret', 'token', 'signingkey', 'password', 'credential', 'tokensignature'];
    const sanitized: Record<string, unknown> = {};

    for (const [k, v] of Object.entries(details)) {
      if (sensitiveKeys.some((s) => k.toLowerCase().includes(s))) {
        sanitized[k] = '[REDACTED]';
      } else if (v && typeof v === 'object' && !Array.isArray(v)) {
        sanitized[k] = this.scrubSecrets(v as Record<string, unknown>);
      } else {
        sanitized[k] = v;
      }
    }
    return sanitized;
  }

  private validateTenant(tenantId: string): void {
    if (!tenantId || tenantId.includes('..') || tenantId.includes('\0')) {
      throw new PolicyLifecycleTenantIsolationError('INVALID_TENANT_ID_IN_AUDIT');
    }
  }
}
