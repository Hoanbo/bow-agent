// src/core/network/networkCodec.ts
// BOWCON V4.0 — MILESTONE 1.3.21: DETERMINISTIC NETWORK CODEC
//
// EN:
// Authoritative network frame encoder and decoder.
// Deterministic, bounded, fail-closed framing. Defends against malformed payloads,
// nesting abuse, prototype pollution, null bytes, path traversal, Windows reserved devices,
// and leaks zero secrets on errors.
//
// VI:
// Trình mã hóa và giải mã khung mạng có thẩm quyền.
// Đóng khung tất định, có giới hạn và thất bại đóng. Phòng thủ chống dữ liệu dị dạng,
// lạm dụng độ sâu, prototype pollution, ký tự null, duyệt đường dẫn, thiết bị Windows đặc biệt,
// và khử sạch bí mật khi phát sinh lỗi.

import type { NetworkFrame } from './networkTypes.js';
import {
  validateNetworkPayloadBounds,
  validateNetworkIdentifier,
  redactNetworkSecrets,
  MAX_NETWORK_PAYLOAD_SIZE_BYTES,
  deepFreeze,
} from './networkValidator.js';
import {
  computePayloadChecksum,
  computeNetworkFrameFingerprint,
} from './networkFingerprint.js';

export interface NetworkCodecOptions {
  readonly maxRawSizeBytes?: number;
}

export class NetworkCodec {
  private readonly maxRawSizeBytes: number;

  constructor(options?: NetworkCodecOptions) {
    this.maxRawSizeBytes = options?.maxRawSizeBytes ?? MAX_NETWORK_PAYLOAD_SIZE_BYTES * 2;
  }

  /**
   * EN: Encodes a NetworkFrame into a deterministic JSON string.
   * VI: Mã hóa một NetworkFrame thành chuỗi JSON tất định.
   */
  public encode(frame: Readonly<NetworkFrame>): string {
    try {
      if (!frame || typeof frame !== 'object') {
        throw new Error('Frame must be a valid object.');
      }
      validateNetworkIdentifier('frameId', frame.frameId);
      validateNetworkIdentifier('networkConnectionId', frame.networkConnectionId);
      validateNetworkPayloadBounds(frame.payload);

      const encoded = JSON.stringify(frame);
      if (encoded.length > this.maxRawSizeBytes) {
        throw new Error(
          `Encoded frame exceeds max size of ${this.maxRawSizeBytes} bytes (got ${encoded.length}).`,
        );
      }
      return encoded;
    } catch (err: any) {
      const scrubbed = redactNetworkSecrets(err?.message ?? 'Unknown encoding error');
      throw new Error(`[NETWORK_CODEC_ENCODE_ERROR] ${scrubbed}`);
    }
  }

  /**
   * EN: Decodes a raw string into an immutable, validated NetworkFrame.
   * VI: Giải mã một chuỗi thô thành một NetworkFrame bất biến đã được xác thực.
   */
  public decode(raw: string): Readonly<NetworkFrame> {
    try {
      if (typeof raw !== 'string') {
        throw new Error('Raw input must be a string.');
      }

      if (raw.length > this.maxRawSizeBytes) {
        throw new Error(
          `Raw input size (${raw.length} bytes) exceeds limit of ${this.maxRawSizeBytes} bytes.`,
        );
      }

      if (raw.includes('\0')) {
        throw new Error('Raw input contains forbidden null byte.');
      }

      const parsed = JSON.parse(raw);

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Parsed frame must be a JSON object.');
      }

      // Structure check
      const frameId = validateNetworkIdentifier('frameId', parsed.frameId);
      const protocolVersion = validateNetworkIdentifier('protocolVersion', parsed.protocolVersion);
      const networkConnectionId = validateNetworkIdentifier(
        'networkConnectionId',
        parsed.networkConnectionId,
      );
      const gatewayId = validateNetworkIdentifier('gatewayId', parsed.gatewayId);
      const transportId = validateNetworkIdentifier('transportId', parsed.transportId);
      const surfaceId = validateNetworkIdentifier('surfaceId', parsed.surfaceId);
      const messageType = validateNetworkIdentifier('messageType', parsed.messageType);

      if (
        typeof parsed.sequence !== 'number' ||
        isNaN(parsed.sequence) ||
        !Number.isInteger(parsed.sequence) ||
        parsed.sequence < 0
      ) {
        throw new Error('Frame sequence must be a non-negative integer.');
      }

      if (
        parsed.direction !== 'INBOUND' &&
        parsed.direction !== 'OUTBOUND' &&
        parsed.direction !== 'BIDIRECTIONAL'
      ) {
        throw new Error(`Invalid frame direction: "${parsed.direction}".`);
      }

      if (!parsed.payload || typeof parsed.payload !== 'object') {
        throw new Error('Frame payload must be a defined object.');
      }

      // Deep security and bounds validation on payload
      validateNetworkPayloadBounds(parsed.payload);
      if (parsed.metadata) {
        validateNetworkPayloadBounds(parsed.metadata);
      }

      // Checksum validation
      const actualChecksum = computePayloadChecksum(parsed.payload);
      if (parsed.checksum !== actualChecksum) {
        throw new Error(
          `Frame checksum mismatch: declared "${parsed.checksum}", computed "${actualChecksum}".`,
        );
      }

      // Fingerprint validation
      const expectedFingerprint = computeNetworkFrameFingerprint({
        networkConnectionId,
        sequence: parsed.sequence,
        direction: parsed.direction,
        messageType,
        payloadChecksum: actualChecksum,
      });

      if (parsed.fingerprint !== expectedFingerprint) {
        throw new Error(
          `Frame fingerprint mismatch: declared "${parsed.fingerprint}", computed "${expectedFingerprint}".`,
        );
      }

      const decodedFrame: NetworkFrame = {
        frameId,
        protocolVersion,
        networkConnectionId,
        gatewayId,
        transportId,
        surfaceId,
        sequence: parsed.sequence,
        direction: parsed.direction,
        messageType,
        payload: deepFreeze({ ...parsed.payload }),
        payloadLength: parsed.payloadLength ?? JSON.stringify(parsed.payload).length,
        checksum: actualChecksum,
        createdState: parsed.createdState ?? 'OPEN',
        metadata: parsed.metadata ? deepFreeze({ ...parsed.metadata }) : undefined,
        timestamp: parsed.timestamp ?? 0,
        fingerprint: expectedFingerprint,
      };

      return deepFreeze(decodedFrame);
    } catch (err: any) {
      const scrubbed = redactNetworkSecrets(err?.message ?? 'Unknown decoding error');
      throw new Error(`[NETWORK_CODEC_DECODE_ERROR] ${scrubbed}`);
    }
  }

  /**
   * EN: Validates encoded raw string without throwing.
   * VI: Xác thực chuỗi thô đã mã hóa mà không ném lỗi.
   */
  public validateEncodedFrame(raw: string): boolean {
    try {
      this.decode(raw);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * EN: Validates a decoded frame in memory.
   * VI: Xác thực một khung đã giải mã trong bộ nhớ.
   */
  public validateDecodedFrame(frame: Readonly<NetworkFrame>): boolean {
    try {
      const encoded = this.encode(frame);
      const decoded = this.decode(encoded);
      return decoded.frameId === frame.frameId;
    } catch {
      return false;
    }
  }
}
