// src/core/network/networkFrame.ts
// BOWCON V4.0 — MILESTONE 1.3.21: CANONICAL IMMUTABLE NETWORK FRAME
//
// EN:
// Authoritative canonical network frame construction and validation.
// Immutable, deep frozen, bounded, deterministic, and scope-bound.
// A NetworkFrame is a transport envelope only and does not hold cognitive authority.
//
// VI:
// Khởi tạo và xác thực khung mạng (frame) chuẩn mực bất biến có thẩm quyền.
// Bất biến, đóng băng sâu, có giới hạn, tất định và ràng buộc phạm vi.
// NetworkFrame chỉ là phong bì vận chuyển và không nắm giữ thẩm quyền nhận thức.

import type { NetworkFrame, NetworkDirection } from './networkTypes.js';
import {
  fnv1aHex,
  computeNetworkFrameFingerprint,
  computePayloadChecksum,
} from './networkFingerprint.js';
import {
  validateNetworkIdentifier,
  validateNetworkPayloadBounds,
  deepFreeze,
} from './networkValidator.js';

export interface CreateNetworkFrameParams {
  readonly protocolVersion?: string;
  readonly networkConnectionId: string;
  readonly gatewayId: string;
  readonly transportId: string;
  readonly surfaceId: string;
  readonly sequence: number;
  readonly direction: NetworkDirection;
  readonly messageType: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly createdState?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly timestamp?: number;
}

/**
 * EN: Constructs an authoritative immutable NetworkFrame.
 * VI: Khởi tạo một NetworkFrame bất biến có thẩm quyền.
 */
export function createNetworkFrame(
  params: CreateNetworkFrameParams,
): Readonly<NetworkFrame> {
  const protocolVersion = params.protocolVersion ?? '1.0.0';
  const networkConnectionId = validateNetworkIdentifier(
    'networkConnectionId',
    params.networkConnectionId,
  );
  const gatewayId = validateNetworkIdentifier('gatewayId', params.gatewayId);
  const transportId = validateNetworkIdentifier('transportId', params.transportId);
  const surfaceId = validateNetworkIdentifier('surfaceId', params.surfaceId);
  const messageType = validateNetworkIdentifier('messageType', params.messageType);

  if (
    typeof params.sequence !== 'number' ||
    isNaN(params.sequence) ||
    !Number.isInteger(params.sequence) ||
    params.sequence < 0
  ) {
    throw new Error(
      `[NETWORK_FRAME_ERROR] Sequence must be a non-negative integer. Received ${params.sequence}.`,
    );
  }

  // Validate payload boundaries
  validateNetworkPayloadBounds(params.payload);
  if (params.metadata) {
    validateNetworkPayloadBounds(params.metadata);
  }

  const payloadChecksum = computePayloadChecksum(params.payload);
  const payloadStr = JSON.stringify(params.payload);
  const payloadLength = payloadStr ? payloadStr.length : 0;
  const ts = params.timestamp ?? 0;
  const createdState = params.createdState ?? 'OPEN';

  const frameFp = computeNetworkFrameFingerprint({
    networkConnectionId,
    sequence: params.sequence,
    direction: params.direction,
    messageType,
    payloadChecksum,
  });

  const frameId = `frm_${frameFp}`;

  const frame: NetworkFrame = {
    frameId,
    protocolVersion,
    networkConnectionId,
    gatewayId,
    transportId,
    surfaceId,
    sequence: params.sequence,
    direction: params.direction,
    messageType,
    payload: deepFreeze({ ...params.payload }),
    payloadLength,
    checksum: payloadChecksum,
    createdState,
    metadata: params.metadata ? deepFreeze({ ...params.metadata }) : undefined,
    timestamp: ts,
    fingerprint: frameFp,
  };

  return deepFreeze(frame);
}

/**
 * EN: Validates frame integrity, checksum matching, and structure.
 * VI: Xác thực tính toàn vẹn của khung, khớp checksum và cấu trúc.
 */
export function validateNetworkFrame(frame: unknown): boolean {
  if (!frame || typeof frame !== 'object') return false;
  const f = frame as NetworkFrame;

  if (
    typeof f.frameId !== 'string' ||
    !f.frameId.startsWith('frm_') ||
    typeof f.networkConnectionId !== 'string' ||
    typeof f.sequence !== 'number' ||
    typeof f.direction !== 'string' ||
    typeof f.messageType !== 'string' ||
    !f.payload ||
    typeof f.payload !== 'object'
  ) {
    return false;
  }

  const computedChecksum = computePayloadChecksum(f.payload);
  if (computedChecksum !== f.checksum) {
    return false;
  }

  return true;
}

/**
 * EN: Asserts valid network frame or throws descriptive error.
 * VI: Khẳng định khung mạng hợp lệ hoặc ném lỗi mô tả.
 */
export function assertValidNetworkFrame(frame: unknown): asserts frame is Readonly<NetworkFrame> {
  if (!validateNetworkFrame(frame)) {
    throw new Error('[NETWORK_FRAME_ERROR] Frame integrity validation failed.');
  }
}
