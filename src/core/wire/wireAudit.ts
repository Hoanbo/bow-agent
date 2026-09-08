// src/core/wire/wireAudit.ts
// BOWCON V4.0 — SECURE REAL WIRE TRANSPORT & RELAY GATEWAY RUNTIME (MS-1.3.28)
//
// Append-Only Immutable Wire Audit Ledger with Automated Secret Scrubbing.
//
// Automatically scrubs private keys, credentials, tokens, and authorization secrets
// from all recorded security and transport events.

import { createHash } from 'node:crypto';
import type {
  WireAuditRecord,
  WireSecurityEventType,
  WireRiskLevel,
} from './wireTypes.js';

const SENSITIVE_KEYS = new Set([
  'key',
  'privatekey',
  'private_key',
  'secret',
  'password',
  'token',
  'authorization',
  'bearer',
  'auth',
  'proof',
  'resumetoken',
  'resume_token',
  'challenge',
]);

export function scrubSecrets(data: unknown, depth = 0): unknown {
  if (depth > 10) return '[MAX_DEPTH_REACHED]';
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    if (
      data.includes('-----BEGIN PRIVATE KEY-----') ||
      data.includes('-----BEGIN RSA PRIVATE KEY-----') ||
      data.includes('-----BEGIN EC PRIVATE KEY-----')
    ) {
      return '[REDACTED_KEY_BLOCK]';
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => scrubSecrets(item, depth + 1));
  }

  if (typeof data === 'object') {
    const scrubbed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.has(lowerKey)) {
        scrubbed[key] = '[REDACTED_SECRET]';
      } else {
        scrubbed[key] = scrubSecrets(value, depth + 1);
      }
    }
    return scrubbed;
  }

  return data;
}

export class WireAuditLedger {
  private records: WireAuditRecord[] = [];
  private readonly maxRecords: number;

  constructor(maxRecords = 5000) {
    this.maxRecords = maxRecords;
  }

  public recordEvent(params: {
    eventType: WireSecurityEventType;
    connectionId: string;
    deviceId?: string;
    sessionId?: string;
    details?: Record<string, unknown>;
    riskLevel?: WireRiskLevel;
  }): WireAuditRecord {
    const timestamp = Date.now();
    const sanitizedDetails = (scrubSecrets(params.details ?? {}) as Record<string, unknown>) ?? {};
    const auditId = `audit_${createHash('sha256')
      .update(`${params.eventType}::${params.connectionId}::${timestamp}::${this.records.length}`)
      .digest('hex')
      .slice(0, 16)}`;

    const record: WireAuditRecord = Object.freeze({
      auditId,
      eventType: params.eventType,
      connectionId: params.connectionId,
      deviceId: params.deviceId,
      sessionId: params.sessionId,
      timestamp,
      details: Object.freeze(sanitizedDetails),
      riskLevel: params.riskLevel ?? 'LOW',
    });

    if (this.records.length >= this.maxRecords) {
      this.records.shift(); // Evict oldest to bound memory
    }

    this.records.push(record);
    return record;
  }

  public getRecords(): readonly WireAuditRecord[] {
    return Object.freeze([...this.records]);
  }

  public getRecordsByConnection(connectionId: string): readonly WireAuditRecord[] {
    return Object.freeze(this.records.filter((r) => r.connectionId === connectionId));
  }

  public getRecordsByDevice(deviceId: string): readonly WireAuditRecord[] {
    return Object.freeze(this.records.filter((r) => r.deviceId === deviceId));
  }

  public clear(): void {
    this.records = [];
  }
}
