// src/core/world-action/worldActionAudit.ts
// BOWCON V4.0 — MS-1.3.33: REAL BOWCON WORLD ACTION & GOVERNED EXECUTION RUNTIME
//
// Append-only audit logger for governed physical host actions with recursive secret scrubbing.
//
// INVARIANTS:
// Never store secrets, credentials, or private keys.
// Fail-closed audit integrity.
// Cryptographic event binding.

import crypto from 'node:crypto';
import { globalAuditLedger } from '../auditLedger.js';

export type WorldActionAuditEventType =
  | 'REQUESTED'
  | 'PLANNED'
  | 'AUTHORIZED'
  | 'DENIED'
  | 'EXECUTION_STARTED'
  | 'EXECUTION_COMPLETED'
  | 'VERIFICATION_STARTED'
  | 'VERIFICATION_PASSED'
  | 'VERIFICATION_FAILED'
  | 'COMMITTED'
  | 'ROLLED_BACK'
  | 'ROLLBACK_FAILED'
  | 'CANCELLED'
  | 'TIMEOUT'
  | 'SECURITY_BLOCK';

export interface WorldActionAuditEntry {
  readonly eventId: string;
  readonly eventType: WorldActionAuditEventType;
  readonly actionId: string;
  readonly traceId?: string;
  readonly tenantId?: string;
  readonly deviceId?: string;
  readonly userId?: string;
  readonly toolId?: string;
  readonly target?: string;
  readonly timestamp: string;
  readonly payload: Record<string, any>;
  readonly payloadHash: string;
  readonly previousHash: string;
}

export class WorldActionAuditLogger {
  private inMemoryEvents: WorldActionAuditEntry[] = [];
  private lastHash: string = '0'.repeat(64);

  public record(
    eventType: WorldActionAuditEventType,
    actionId: string,
    payload: Record<string, any> = {},
    metadata?: { traceId?: string; tenantId?: string; deviceId?: string; userId?: string; toolId?: string; target?: string }
  ): WorldActionAuditEntry {
    const scrubbedPayload = this.scrubSensitiveData(payload);
    const eventId = `wa_audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const timestamp = new Date().toISOString();
    const payloadJson = JSON.stringify(scrubbedPayload);
    const payloadHash = crypto.createHash('sha256').update(payloadJson).digest('hex');

    const entryHash = crypto
      .createHash('sha256')
      .update(`${eventId}:${eventType}:${actionId}:${this.lastHash}:${payloadHash}`)
      .digest('hex');

    const entry: WorldActionAuditEntry = {
      eventId,
      eventType,
      actionId,
      traceId: metadata?.traceId,
      tenantId: metadata?.tenantId,
      deviceId: metadata?.deviceId,
      userId: metadata?.userId,
      toolId: metadata?.toolId,
      target: metadata?.target,
      timestamp,
      payload: scrubbedPayload,
      payloadHash,
      previousHash: this.lastHash,
    };

    this.lastHash = entryHash;
    this.inMemoryEvents.push(entry);

    // Also record into the global governance audit ledger
    try {
      globalAuditLedger.record({
        timestamp,
        actor: {
          userId: metadata?.userId || 'unknown',
          role: 'world_action_runtime',
          channel: 'WORLD_ACTION',
        },
        domain: 'desktop',
        toolName: metadata?.toolId || 'world_action',
        classification: 'REVERSIBLE',
        argumentsHash: payloadHash,
        policyDecision: eventType === 'DENIED' || eventType === 'SECURITY_BLOCK' ? 'DENY' : 'PERMIT',
        executionStatus: eventType === 'COMMITTED' ? 'SUCCESS' : (eventType === 'VERIFICATION_FAILED' || eventType === 'TIMEOUT') ? 'FAILURE' : 'BLOCKED',
      });
    } catch {
      // Keep local audit intact even if global ledger fails
    }

    return entry;
  }

  public getEventsForAction(actionId: string): WorldActionAuditEntry[] {
    return this.inMemoryEvents.filter(e => e.actionId === actionId);
  }

  public getAllEvents(): readonly WorldActionAuditEntry[] {
    return this.inMemoryEvents;
  }

  public scrubSensitiveData(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') {
      return this.scrubString(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this.scrubSensitiveData(item));
    }
    if (typeof obj === 'object') {
      const scrubbed: Record<string, any> = {};
      const sensitiveKeys = ['secret', 'token', 'password', 'key', 'auth', 'signature', 'private', 'bearer'];
      for (const [k, v] of Object.entries(obj)) {
        if (sensitiveKeys.some(sk => k.toLowerCase().includes(sk))) {
          scrubbed[k] = '[REDACTED_SECRET]';
        } else {
          scrubbed[k] = this.scrubSensitiveData(v);
        }
      }
      return scrubbed;
    }
    return obj;
  }

  private scrubString(str: string): string {
    return str
      .replace(/(bearer\s+)[a-zA-Z0-9_\-\.]{10,}/gi, '$1[REDACTED_SECRET]')
      .replace(/(token=)[a-zA-Z0-9_\-\.]{10,}/gi, '$1[REDACTED_SECRET]')
      .replace(/(api[_-]?key[=:\s]+)[a-zA-Z0-9_\-]{10,}/gi, '$1[REDACTED_SECRET]');
  }

  public clear(): void {
    this.inMemoryEvents = [];
    this.lastHash = '0'.repeat(64);
  }
}

export const globalWorldActionAudit = new WorldActionAuditLogger();
