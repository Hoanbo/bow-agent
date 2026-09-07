// src/core/remote/remoteFailure.ts
// BOWCON V4.0 — MILESTONE 1.3.20: TYPED REMOTE FAILURE DESCRIPTOR FACTORY
//
// EN:
// Authoritative typed failure descriptors for Remote Gateway and Protocol errors.
// Automatic secret scrubbing prevents credential or token leakage.
//
// VI:
// Bộ mô tả lỗi định kiểu có thẩm quyền cho các lỗi Cổng từ xa và Giao thức.
// Tự động lọc sạch bí mật ngăn ngừa rò rỉ thông tin xác thực hoặc token.

import type { RemoteFailureCode } from './remoteTypes.js';
import { fnv1aHex } from './remoteFingerprint.js';
import { deepFreeze, redactRemoteSecrets } from './remoteValidator.js';

export interface RemoteFailureDescriptor {
  readonly failureId: string;
  readonly failureCode: RemoteFailureCode;
  readonly peerId?: string;
  readonly remoteSessionId?: string;
  readonly reason: string;
  readonly timestamp: number;
  readonly fingerprint: string;
}

/**
 * EN: Creates an immutable, secret-scrubbed RemoteFailureDescriptor.
 * VI: Khởi tạo một RemoteFailureDescriptor bất biến và đã được lọc sạch bí mật.
 */
export function createRemoteFailureDescriptor(params: {
  readonly failureCode: RemoteFailureCode;
  readonly reason: string;
  readonly peerId?: string;
  readonly remoteSessionId?: string;
  readonly timestamp?: number;
}): Readonly<RemoteFailureDescriptor> {
  const ts = params.timestamp ?? 0;
  const safeReason = redactRemoteSecrets(params.reason);
  const fp = fnv1aHex(
    `${params.failureCode}::${params.peerId ?? ''}::${params.remoteSessionId ?? ''}::${safeReason}`,
  );

  const descriptor: RemoteFailureDescriptor = {
    failureId: `rfail_${fp}`,
    failureCode: params.failureCode,
    peerId: params.peerId,
    remoteSessionId: params.remoteSessionId,
    reason: safeReason,
    timestamp: ts,
    fingerprint: fp,
  };

  return deepFreeze(descriptor);
}
