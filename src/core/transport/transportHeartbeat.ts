// src/core/transport/transportHeartbeat.ts
// BOWCON V4.0 — MILESTONE 1.3.19: TRANSPORT HEARTBEAT MODEL
//
// EN:
// Transport heartbeat metadata and acknowledgement tracking.
// Connectivity signal only: heartbeat NEVER executes tools, invokes LLM,
// mutates cognitive state, or implies task success.
//
// VI:
// Metadata nhịp tim truyền tải và theo dõi xác nhận nhịp tim.
// Chỉ là tín hiệu kết nối: heartbeat KHÔNG BAO GIỜ thực thi tool, gọi LLM,
// biến đổi trạng thái nhận thức, hay ngụ ý thành công tác vụ.

import { computeHeartbeatFingerprint, fnv1aHex } from './transportFingerprint.js';
import { deepFreeze } from './transportValidator.js';

export type HeartbeatHealthStatus = 'HEALTHY' | 'DEGRADED' | 'TIMEOUT';

export interface HeartbeatSignal {
  readonly heartbeatId: string;
  readonly connectionId: string;
  readonly heartbeatSequence: number;
  readonly healthStatus: HeartbeatHealthStatus;
  readonly timestamp: number;
  readonly fingerprint: string;
}

export interface HeartbeatAck {
  readonly ackId: string;
  readonly connectionId: string;
  readonly heartbeatSequence: number;
  readonly surfaceId: string;
  readonly timestamp: number;
  readonly fingerprint: string;
}

/**
 * EN: Creates an immutable HeartbeatSignal.
 * VI: Khởi tạo một HeartbeatSignal bất biến.
 */
export function createHeartbeatSignal(params: {
  readonly connectionId: string;
  readonly heartbeatSequence: number;
  readonly healthStatus?: HeartbeatHealthStatus;
  readonly timestamp?: number;
}): Readonly<HeartbeatSignal> {
  const ts = params.timestamp ?? 0;
  const status: HeartbeatHealthStatus = params.healthStatus ?? 'HEALTHY';
  const fp = computeHeartbeatFingerprint({
    connectionId: params.connectionId,
    heartbeatSequence: params.heartbeatSequence,
    state: status,
  });

  const signal: HeartbeatSignal = {
    heartbeatId: `hb_${fp}`,
    connectionId: params.connectionId,
    heartbeatSequence: params.heartbeatSequence,
    healthStatus: status,
    timestamp: ts,
    fingerprint: fp,
  };

  return deepFreeze(signal);
}

/**
 * EN: Creates an immutable HeartbeatAck in response to a HeartbeatSignal.
 * VI: Khởi tạo một HeartbeatAck bất biến đáp ứng một HeartbeatSignal.
 */
export function createHeartbeatAck(params: {
  readonly connectionId: string;
  readonly heartbeatSequence: number;
  readonly surfaceId: string;
  readonly timestamp?: number;
}): Readonly<HeartbeatAck> {
  const ts = params.timestamp ?? 0;
  const fp = fnv1aHex(`${params.connectionId}::HB_ACK::${params.heartbeatSequence}::${params.surfaceId}`);

  const ack: HeartbeatAck = {
    ackId: `hback_${fp}`,
    connectionId: params.connectionId,
    heartbeatSequence: params.heartbeatSequence,
    surfaceId: params.surfaceId,
    timestamp: ts,
    fingerprint: fp,
  };

  return deepFreeze(ack);
}
