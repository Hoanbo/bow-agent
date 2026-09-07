// src/core/remote/remoteSequence.ts
// BOWCON V4.0 — MILESTONE 1.3.20: REMOTE MONOTONIC SEQUENCE TRACKER
//
// EN:
// Authoritative remote message sequence ordering, progression validation,
// gap detection, and stale sequence rejection. Zero silent sequence rollback.
//
// VI:
// Theo dõi thứ tự chuỗi số đơn điệu của thông điệp từ xa có thẩm quyền,
// kiểm tra tiến trình, phát hiện khoảng cách và từ chối số thứ tự cũ. Không tua lùi chuỗi ngầm.

import { deepFreeze } from './remoteValidator.js';

export type RemoteSequenceStatus =
  | 'NEXT_IN_ORDER'
  | 'DUPLICATE_SEQUENCE'
  | 'SEQUENCE_GAP'
  | 'STALE_SEQUENCE'
  | 'INVALID_SEQUENCE';

export interface RemoteSequenceResult {
  readonly status: RemoteSequenceStatus;
  readonly expectedSequence: number;
  readonly actualSequence: number;
  readonly missingCount?: number;
  readonly reason?: string;
}

/**
 * EN: Analyzes incoming sequence against the last accepted sequence.
 * VI: Phân tích số thứ tự đến so với số thứ tự được chấp nhận gần nhất.
 */
export function analyzeRemoteSequence(
  lastAcceptedSequence: number,
  incomingSequence: number,
): Readonly<RemoteSequenceResult> {
  if (
    typeof incomingSequence !== 'number' ||
    isNaN(incomingSequence) ||
    !Number.isInteger(incomingSequence) ||
    incomingSequence <= 0
  ) {
    return deepFreeze({
      status: 'INVALID_SEQUENCE',
      expectedSequence: lastAcceptedSequence + 1,
      actualSequence: incomingSequence,
      reason: 'Sequence must be a positive integer.',
    });
  }

  const expected = lastAcceptedSequence + 1;

  if (incomingSequence === expected) {
    return deepFreeze({
      status: 'NEXT_IN_ORDER',
      expectedSequence: expected,
      actualSequence: incomingSequence,
    });
  }

  if (incomingSequence === lastAcceptedSequence) {
    return deepFreeze({
      status: 'DUPLICATE_SEQUENCE',
      expectedSequence: expected,
      actualSequence: incomingSequence,
    });
  }

  if (incomingSequence < lastAcceptedSequence) {
    return deepFreeze({
      status: 'STALE_SEQUENCE',
      expectedSequence: expected,
      actualSequence: incomingSequence,
    });
  }

  // incomingSequence > expected
  const missingCount = incomingSequence - expected;
  return deepFreeze({
    status: 'SEQUENCE_GAP',
    expectedSequence: expected,
    actualSequence: incomingSequence,
    missingCount,
  });
}

/**
 * EN: Asserts valid monotonic progression or throws descriptive error.
 * VI: Khẳng định tiến trình đơn điệu hợp lệ hoặc ném lỗi mô tả.
 */
export function assertRemoteSequenceProgression(
  lastAcceptedSequence: number,
  incomingSequence: number,
): void {
  const analysis = analyzeRemoteSequence(lastAcceptedSequence, incomingSequence);
  if (analysis.status === 'INVALID_SEQUENCE') {
    throw new Error(`[REMOTE_SEQUENCE_ERROR] ${analysis.reason}`);
  }
  if (analysis.status === 'STALE_SEQUENCE') {
    throw new Error(
      `[REMOTE_SEQUENCE_ERROR] Stale sequence: got ${incomingSequence}, expected ${analysis.expectedSequence}.`,
    );
  }
  if (analysis.status === 'SEQUENCE_GAP') {
    throw new Error(
      `[REMOTE_SEQUENCE_GAP_ERROR] Sequence gap: got ${incomingSequence}, expected ${analysis.expectedSequence} (${analysis.missingCount} missing).`,
    );
  }
}
