// src/core/transport/transportDelivery.ts
// BOWCON V4.0 — MILESTONE 1.3.19: MESSAGE DELIVERY LIFECYCLE TRACKER
//
// EN:
// Authoritative delivery record tracking per message across CREATED, VALIDATED, QUEUED,
// DISPATCHABLE, SENT, DELIVERED, ACKNOWLEDGED, REJECTED, TIMED_OUT, STALE, DUPLICATE,
// CONFLICTED, FAILED, SUPERSEDED states.
//
// CRITICAL INVARIANT:
// DELIVERED != verification, tool execution, or commit.
// ACKNOWLEDGED != task success or cognitive state mutation.
//
// VI:
// Theo dõi vòng đời phân phối có thẩm quyền cho từng thông điệp qua các trạng thái.
// BẢO ĐẢM CỐT LÕI: DELIVERED/ACKNOWLEDGED KHÔNG PHẢI là thành công tác vụ hay biến đổi nhận thức.

import type { TransportDeliveryState } from './transportStates.js';
import type { TransportFailureCode, BrainTransportMessage } from './transportTypes.js';
import { assertValidDeliveryTransition } from './transportTransitions.js';
import { deepFreeze, redactTransportSecrets } from './transportValidator.js';
import { fnv1aHex } from './transportFingerprint.js';

export interface TransportDeliveryRecord {
  readonly messageId: string;
  readonly connectionId: string;
  readonly sequence: number;
  readonly state: TransportDeliveryState;
  readonly failureCode?: TransportFailureCode;
  readonly failureReason?: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly sentAt?: number;
  readonly deliveredAt?: number;
  readonly acknowledgedAt?: number;
  readonly fingerprint: string;
}

/**
 * EN: Creates an initial TransportDeliveryRecord for an envelope.
 * VI: Khởi tạo một TransportDeliveryRecord ban đầu cho một phong bì.
 */
export function createDeliveryRecord(
  message: Readonly<BrainTransportMessage>,
  timestamp = 0,
): Readonly<TransportDeliveryRecord> {
  const fp = fnv1aHex(`${message.messageId}::CREATED::${message.sequence}`);
  const record: TransportDeliveryRecord = {
    messageId: message.messageId,
    connectionId: message.connectionId,
    sequence: message.sequence,
    state: 'CREATED',
    createdAt: timestamp,
    updatedAt: timestamp,
    fingerprint: fp,
  };
  return deepFreeze(record);
}

/**
 * EN: Transitions delivery state following strict delivery transition matrix.
 * VI: Chuyển đổi trạng thái phân phối tuân theo ma trận chuyển đổi phân phối nghiêm ngặt.
 */
export function transitionDelivery(
  current: Readonly<TransportDeliveryRecord>,
  nextState: TransportDeliveryState,
  options?: {
    readonly failureCode?: TransportFailureCode;
    readonly failureReason?: string;
    readonly timestamp?: number;
  },
): Readonly<TransportDeliveryRecord> {
  assertValidDeliveryTransition(current.state, nextState);

  const ts = options?.timestamp ?? current.updatedAt;
  const safeReason = options?.failureReason
    ? redactTransportSecrets(options.failureReason)
    : undefined;

  const nextRecord: TransportDeliveryRecord = {
    ...current,
    state: nextState,
    failureCode: options?.failureCode ?? current.failureCode,
    failureReason: safeReason ?? current.failureReason,
    updatedAt: ts,
    sentAt: nextState === 'SENT' ? ts : current.sentAt,
    deliveredAt: nextState === 'DELIVERED' ? ts : current.deliveredAt,
    acknowledgedAt: nextState === 'ACKNOWLEDGED' ? ts : current.acknowledgedAt,
    fingerprint: fnv1aHex(`${current.messageId}::${nextState}::${ts}`),
  };

  return deepFreeze(nextRecord);
}
