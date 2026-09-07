// src/core/transport/transportAck.ts
// BOWCON V4.0 — MILESTONE 1.3.19: TRANSPORT ACKNOWLEDGEMENT & NACK MODEL
//
// EN:
// Canonical acknowledgement (ACK) and negative-acknowledgement (NACK) records.
// Explicit ACK classifications: RECEIVED, VALIDATED, PROCESSED, REJECTED.
// Strict architectural boundary: ACK != task success. TASK_SUCCEEDED is forbidden in transport ACK.
//
// VI:
// Các bản ghi xác nhận (ACK) và từ chối xác nhận (NACK) chuẩn mực.
// Phân loại ACK tường minh: RECEIVED, VALIDATED, PROCESSED, REJECTED.
// Ranh giới kiến trúc nghiêm ngặt: ACK KHÔNG PHẢI là thành công tác vụ. Cấm dùng TASK_SUCCEEDED trong ACK.

import type { TransportFailureCode, BrainTransportMessage } from './transportTypes.js';
import { computeAckFingerprint } from './transportFingerprint.js';
import { deepFreeze, redactTransportSecrets } from './transportValidator.js';

export type AckClassification = 'RECEIVED' | 'VALIDATED' | 'PROCESSED' | 'REJECTED';

export const ALL_ACK_CLASSIFICATIONS: ReadonlySet<AckClassification> = Object.freeze(
  new Set<AckClassification>(['RECEIVED', 'VALIDATED', 'PROCESSED', 'REJECTED']),
);

export interface TransportAckRecord {
  readonly ackId: string;
  readonly messageId: string;
  readonly connectionId: string;
  readonly surfaceId: string;
  readonly sequence: number;
  readonly correlationId: string;
  readonly classification: AckClassification;
  readonly details?: string;
  readonly timestamp: number;
  readonly fingerprint: string;
}

export interface TransportNackRecord {
  readonly nackId: string;
  readonly messageId: string;
  readonly connectionId: string;
  readonly surfaceId: string;
  readonly sequence: number;
  readonly correlationId: string;
  readonly failureCode: TransportFailureCode;
  readonly reason: string;
  readonly timestamp: number;
  readonly fingerprint: string;
}

/**
 * EN: Creates an immutable TransportAckRecord.
 * VI: Khởi tạo một TransportAckRecord bất biến.
 */
export function createTransportAck(params: {
  readonly message: Readonly<BrainTransportMessage>;
  readonly classification: AckClassification;
  readonly details?: string;
  readonly timestamp?: number;
}): Readonly<TransportAckRecord> {
  if (!ALL_ACK_CLASSIFICATIONS.has(params.classification)) {
    throw new Error(
      `[TRANSPORT_ACK_ERROR] Invalid ACK classification: "${String(params.classification)}". TASK_SUCCEEDED is strictly forbidden.`,
    );
  }

  const ts = params.timestamp ?? 0;
  const safeDetails = params.details ? redactTransportSecrets(params.details) : undefined;
  const fp = computeAckFingerprint({
    messageId: params.message.messageId,
    connectionId: params.message.connectionId,
    surfaceId: params.message.surfaceId,
    sequence: params.message.sequence,
    correlationId: params.message.correlationId,
    ackType: params.classification,
  });

  const record: TransportAckRecord = {
    ackId: `ack_${fp}`,
    messageId: params.message.messageId,
    connectionId: params.message.connectionId,
    surfaceId: params.message.surfaceId,
    sequence: params.message.sequence,
    correlationId: params.message.correlationId,
    classification: params.classification,
    details: safeDetails,
    timestamp: ts,
    fingerprint: fp,
  };

  return deepFreeze(record);
}

/**
 * EN: Creates an immutable TransportNackRecord for rejected / failed deliveries.
 * VI: Khởi tạo một TransportNackRecord bất biến cho các phân phối bị từ chối / thất bại.
 */
export function createTransportNack(params: {
  readonly message: Readonly<BrainTransportMessage>;
  readonly failureCode: TransportFailureCode;
  readonly reason: string;
  readonly timestamp?: number;
}): Readonly<TransportNackRecord> {
  const ts = params.timestamp ?? 0;
  const safeReason = redactTransportSecrets(params.reason);
  const fp = computeAckFingerprint({
    messageId: params.message.messageId,
    connectionId: params.message.connectionId,
    surfaceId: params.message.surfaceId,
    sequence: params.message.sequence,
    correlationId: params.message.correlationId,
    ackType: `NACK_${params.failureCode}`,
  });

  const record: TransportNackRecord = {
    nackId: `nack_${fp}`,
    messageId: params.message.messageId,
    connectionId: params.message.connectionId,
    surfaceId: params.message.surfaceId,
    sequence: params.message.sequence,
    correlationId: params.message.correlationId,
    failureCode: params.failureCode,
    reason: safeReason,
    timestamp: ts,
    fingerprint: fp,
  };

  return deepFreeze(record);
}
