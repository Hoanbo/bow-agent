// src/core/transport/transportResult.ts
// BOWCON V4.0 — MILESTONE 1.3.19: TRANSPORT AUDIT RECORD & RESULT MODEL
//
// EN:
// Authoritative transport audit records for tracing message movement, connections,
// acknowledgements, and failure events across boundaries without leaking secrets.
//
// VI:
// Bản ghi kiểm tra truyền tải có thẩm quyền để theo dõi chuyển động thông điệp, kết nối,
// xác nhận và các sự kiện thất bại qua các ranh giới mà không làm rò rỉ bí mật.

import { fnv1aHex } from './transportFingerprint.js';
import { deepFreeze, redactTransportSecrets } from './transportValidator.js';

export type TransportAuditAction =
  | 'CONNECT'
  | 'DISCONNECT'
  | 'DISPATCH'
  | 'RECEIVE'
  | 'ACK'
  | 'NACK'
  | 'HEARTBEAT'
  | 'RESUME'
  | 'BACKPRESSURE';

export type TransportAuditOutcome = 'SUCCESS' | 'FAILURE' | 'DEGRADED' | 'REJECTED';

export interface TransportAuditRecord {
  readonly auditId: string;
  readonly connectionId: string;
  readonly messageId?: string;
  readonly action: TransportAuditAction;
  readonly outcome: TransportAuditOutcome;
  readonly details?: string;
  readonly timestamp: number;
  readonly fingerprint: string;
}

/**
 * EN: Creates an immutable, secret-scrubbed TransportAuditRecord.
 * VI: Khởi tạo một TransportAuditRecord bất biến và đã được lọc sạch bí mật.
 */
export function createTransportAuditRecord(params: {
  readonly connectionId: string;
  readonly action: TransportAuditAction;
  readonly outcome: TransportAuditOutcome;
  readonly messageId?: string;
  readonly details?: string;
  readonly timestamp?: number;
}): Readonly<TransportAuditRecord> {
  const ts = params.timestamp ?? 0;
  const safeDetails = params.details ? redactTransportSecrets(params.details) : undefined;
  const fp = fnv1aHex(
    `${params.connectionId}::${params.action}::${params.outcome}::${params.messageId ?? ''}::${safeDetails ?? ''}`,
  );

  const record: TransportAuditRecord = {
    auditId: `taudit_${fp}`,
    connectionId: params.connectionId,
    messageId: params.messageId,
    action: params.action,
    outcome: params.outcome,
    details: safeDetails,
    timestamp: ts,
    fingerprint: fp,
  };

  return deepFreeze(record);
}
