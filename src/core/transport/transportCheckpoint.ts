// src/core/transport/transportCheckpoint.ts
// BOWCON V4.0 — MILESTONE 1.3.19: TRANSPORT STATE CHECKPOINT
//
// EN:
// Authoritative transport state checkpoint for continuity and reconnect tracking.
// Deeply immutable, deterministic fingerprinting.
//
// VI:
// Điểm kiểm tra trạng thái truyền tải có thẩm quyền cho tính liên tục và theo dõi tái kết nối.
// Bất biến sâu, tạo fingerprint tất định.

import { computeTransportCheckpointFingerprint } from './transportFingerprint.js';
import { deepFreeze } from './transportValidator.js';

export interface TransportCheckpoint {
  readonly checkpointId: string;
  readonly connectionId: string;
  readonly scopeKey: string;
  readonly lastSequence: number;
  readonly lastAcknowledgedSequence: number;
  readonly sessionFingerprint: string;
  readonly pendingMessageIds: readonly string[];
  readonly timestamp: number;
  readonly fingerprint: string;
}

/**
 * EN: Creates an immutable TransportCheckpoint.
 * VI: Khởi tạo một TransportCheckpoint bất biến.
 */
export function createTransportCheckpoint(params: {
  readonly connectionId: string;
  readonly scopeKey: string;
  readonly lastSequence: number;
  readonly lastAcknowledgedSequence: number;
  readonly sessionFingerprint: string;
  readonly pendingMessageIds?: readonly string[];
  readonly timestamp?: number;
}): Readonly<TransportCheckpoint> {
  const ts = params.timestamp ?? 0;
  const pending = params.pendingMessageIds ? [...params.pendingMessageIds] : [];
  const fp = computeTransportCheckpointFingerprint({
    connectionId: params.connectionId,
    lastSequence: params.lastSequence,
    sessionFingerprint: params.sessionFingerprint,
  });

  const checkpoint: TransportCheckpoint = {
    checkpointId: `tchk_${fp}`,
    connectionId: params.connectionId,
    scopeKey: params.scopeKey,
    lastSequence: params.lastSequence,
    lastAcknowledgedSequence: params.lastAcknowledgedSequence,
    sessionFingerprint: params.sessionFingerprint,
    pendingMessageIds: Object.freeze(pending),
    timestamp: ts,
    fingerprint: fp,
  };

  return deepFreeze(checkpoint);
}
