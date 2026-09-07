// src/core/transport/transportFingerprint.ts
// BOWCON V4.0 — MILESTONE 1.3.19: DETERMINISTIC TRANSPORT FINGERPRINTING
//
// EN:
// Deterministic non-cryptographic FNV-1a 32-bit hashing for transport messages,
// connections, sessions, acknowledgements, heartbeats, and checkpoints.
// Zero randomness, zero timestamps as identity.
//
// VI:
// Giải thuật băm FNV-1a 32-bit phi mật mã tất định cho các thông điệp truyền tải,
// kết nối, phiên làm việc, xác nhận, nhịp tim và điểm kiểm tra checkpoint.
// Không ngẫu nhiên, không dùng timestamp làm định danh.

import type { TransportMessageType, TransportDirection } from './transportTypes.js';

/**
 * EN: Computes standard 32-bit FNV-1a hash formatted as 8-character hex string.
 * VI: Tính toán mã băm FNV-1a 32-bit tiêu chuẩn dưới dạng chuỗi hex 8 ký tự.
 */
export function fnv1aHex(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * EN: Deterministically stringifies payload with sorted keys to avoid object key order jitter.
 * VI: Chuyển đổi payload thành chuỗi tất định với các key được sắp xếp để tránh rung giật thứ tự key.
 */
export function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalStringify).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const entries = sortedKeys.map(
    key => `${JSON.stringify(key)}:${canonicalStringify(obj[key])}`,
  );
  return `{${entries.join(',')}}`;
}

/**
 * EN: Computes deterministic fingerprint for a message envelope.
 * VI: Tính toán fingerprint tất định cho một phong bì thông điệp.
 */
export function computeMessageFingerprint(params: {
  readonly brainId: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly surfaceId: string;
  readonly transportId: string;
  readonly connectionId: string;
  readonly correlationId: string;
  readonly causationId: string;
  readonly eventId?: string;
  readonly messageType: TransportMessageType;
  readonly direction: TransportDirection;
  readonly sequence: number;
  readonly payload?: Readonly<Record<string, unknown>>;
}): string {
  const serialized = [
    params.brainId,
    params.userId,
    params.sessionId,
    params.surfaceId,
    params.transportId,
    params.connectionId,
    params.correlationId,
    params.causationId,
    params.eventId ?? '',
    params.messageType,
    params.direction,
    String(params.sequence),
    canonicalStringify(params.payload ?? {}),
  ].join('::');
  return fnv1aHex(serialized);
}

/**
 * EN: Computes deterministic connection fingerprint and connectionId.
 * VI: Tính toán fingerprint kết nối và connectionId tất định.
 */
export function computeConnectionFingerprint(params: {
  readonly userId: string;
  readonly sessionId: string;
  readonly brainId: string;
  readonly surfaceId: string;
  readonly transportId: string;
}): string {
  const scope = [
    params.userId,
    params.sessionId,
    params.brainId,
    params.surfaceId,
    params.transportId,
  ].join('::');
  return fnv1aHex(scope);
}

/**
 * EN: Computes deterministic transport session fingerprint.
 * VI: Tính toán fingerprint phiên truyền tải tất định.
 */
export function computeSessionFingerprint(params: {
  readonly connectionId: string;
  readonly scopeKey: string;
  readonly initialSequence: number;
}): string {
  const serialized = [params.connectionId, params.scopeKey, String(params.initialSequence)].join('::');
  return fnv1aHex(serialized);
}

/**
 * EN: Computes deterministic ACK / NACK fingerprint.
 * VI: Tính toán fingerprint ACK / NACK tất định.
 */
export function computeAckFingerprint(params: {
  readonly messageId: string;
  readonly connectionId: string;
  readonly surfaceId: string;
  readonly sequence: number;
  readonly correlationId: string;
  readonly ackType: string;
}): string {
  const serialized = [
    params.messageId,
    params.connectionId,
    params.surfaceId,
    String(params.sequence),
    params.correlationId,
    params.ackType,
  ].join('::');
  return fnv1aHex(serialized);
}

/**
 * EN: Computes deterministic heartbeat fingerprint.
 * VI: Tính toán fingerprint heartbeat tất định.
 */
export function computeHeartbeatFingerprint(params: {
  readonly connectionId: string;
  readonly heartbeatSequence: number;
  readonly state: string;
}): string {
  const serialized = [params.connectionId, String(params.heartbeatSequence), params.state].join('::');
  return fnv1aHex(serialized);
}

/**
 * EN: Computes deterministic reconnect / resume fingerprint.
 * VI: Tính toán fingerprint tái kết nối / phục hồi tất định.
 */
export function computeResumeFingerprint(params: {
  readonly connectionId: string;
  readonly lastAckSequence: number;
  readonly resumeAttempt: number;
}): string {
  const serialized = [params.connectionId, String(params.lastAckSequence), String(params.resumeAttempt)].join('::');
  return fnv1aHex(serialized);
}

/**
 * EN: Computes deterministic checkpoint fingerprint.
 * VI: Tính toán fingerprint checkpoint tất định.
 */
export function computeTransportCheckpointFingerprint(params: {
  readonly connectionId: string;
  readonly lastSequence: number;
  readonly sessionFingerprint: string;
}): string {
  const serialized = [params.connectionId, String(params.lastSequence), params.sessionFingerprint].join('::');
  return fnv1aHex(serialized);
}
