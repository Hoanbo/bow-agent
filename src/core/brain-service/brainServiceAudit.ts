// src/core/brain-service/brainServiceAudit.ts
// BOWCON V4.0 — MS-1.3.31: REAL BOWCON BRAIN SERVICE & CONTINUOUS RUNTIME
//
// Append-Only Service Audit Ledger with Recursive Secret Redaction.

import {
  type BrainServiceAuditEvent,
  type BrainServiceAuditEventType,
  type BrainServiceId,
  makeAuditEventId,
} from './brainServiceTypes.js';
import type { BrainId } from '../brain/brainTypes.js';

const SENSITIVE_KEYS = new Set([
  'password',
  'secret',
  'token',
  'privatekey',
  'apikey',
  'authorization',
  'credential',
]);

function redactSensitive(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map(redactSensitive);
  }
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      result[k] = '[REDACTED_SECRET]';
    } else if (typeof v === 'object' && v !== null) {
      result[k] = redactSensitive(v);
    } else {
      result[k] = v;
    }
  }
  return result;
}

export class BrainServiceAuditLedger {
  private readonly _events: BrainServiceAuditEvent[] = [];
  public readonly serviceId: BrainServiceId;
  public readonly brainId: BrainId;

  constructor(serviceId: BrainServiceId, brainId: BrainId) {
    this.serviceId = serviceId;
    this.brainId = brainId;
  }

  public record(
    type: BrainServiceAuditEventType,
    data?: Record<string, unknown>,
    requestId?: string
  ): BrainServiceAuditEvent {
    const event: BrainServiceAuditEvent = {
      eventId: makeAuditEventId(),
      type,
      serviceId: this.serviceId,
      brainId: this.brainId,
      timestamp: Date.now(),
      requestId,
      data: data ? (redactSensitive(data) as Record<string, unknown>) : undefined,
    };
    this._events.push(event);
    return event;
  }

  public getEvents(): readonly BrainServiceAuditEvent[] {
    return Object.freeze([...this._events]);
  }

  public get count(): number {
    return this._events.length;
  }
}
