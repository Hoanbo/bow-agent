// src/core/transport/transportFailure.ts
// BOWCON V4.0 — MILESTONE 1.3.19: TYPED TRANSPORT FAILURE MODEL
//
// EN:
// Authoritative typed failure descriptors for message transport and delivery errors.
// Automatic secret scrubbing to prevent credential leakage.
//
// VI:
// Bộ mô tả lỗi định kiểu có thẩm quyền cho các lỗi truyền tải và phân phối thông điệp.
// Tự động lọc sạch bí mật để ngăn ngừa rò rỉ thông tin xác thực.

import type { TransportFailureCode } from './transportTypes.js';
import { fnv1aHex } from './transportFingerprint.js';
import { deepFreeze, redactTransportSecrets } from './transportValidator.js';

export interface TransportFailureDescriptor {
  readonly failureId: string;
  readonly failureCode: TransportFailureCode;
  readonly messageId?: string;
  readonly connectionId?: string;
  readonly reason: string;
  readonly timestamp: number;
  readonly fingerprint: string;
}

/**
 * EN: Creates an immutable, secret-scrubbed TransportFailureDescriptor.
 * VI: Khởi tạo một TransportFailureDescriptor bất biến và đã được lọc sạch bí mật.
 */
export function createTransportFailureDescriptor(params: {
  readonly failureCode: TransportFailureCode;
  readonly reason: string;
  readonly messageId?: string;
  readonly connectionId?: string;
  readonly timestamp?: number;
}): Readonly<TransportFailureDescriptor> {
  const ts = params.timestamp ?? 0;
  const safeReason = redactTransportSecrets(params.reason);
  const fp = fnv1aHex(
    `${params.failureCode}::${params.messageId ?? ''}::${params.connectionId ?? ''}::${safeReason}`,
  );

  const descriptor: TransportFailureDescriptor = {
    failureId: `fail_${fp}`,
    failureCode: params.failureCode,
    messageId: params.messageId,
    connectionId: params.connectionId,
    reason: safeReason,
    timestamp: ts,
    fingerprint: fp,
  };

  return deepFreeze(descriptor);
}
