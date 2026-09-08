// src/core/wire/wireFrame.ts
// BOWCON V4.0 — SECURE REAL WIRE TRANSPORT & RELAY GATEWAY RUNTIME (MS-1.3.28)
//
// Wire Frame Serialization, Framing Boundaries, and Checksum Validation.
//
// Enforces:
// - Payload size bounds (MAX 1MB)
// - Cryptographic SHA-256 checksums
// - Malformed frame rejection fail-closed

import { createHash } from 'node:crypto';
import type { WireFrame, WireFrameType } from './wireTypes.js';
import { WireTransportError } from './wireFailure.js';
import { computeWireFrameId } from './wireIdentity.js';

export const MAX_WIRE_FRAME_SIZE = 1_048_576; // 1 MB

export function computeWireFrameChecksum(payload: string): string {
  return createHash('sha256').update(payload, 'utf8').digest('hex');
}

export function createWireFrame(options: {
  frameId?: string;
  frameType: WireFrameType;
  sequence: number;
  payload: string;
  timestamp?: number;
}): WireFrame {
  if (typeof options.payload !== 'string') {
    throw new WireTransportError('WIRE_MALFORMED_FRAME', 'WireFrame payload must be a string.');
  }

  const payloadLength = Buffer.byteLength(options.payload, 'utf8');
  if (payloadLength > MAX_WIRE_FRAME_SIZE) {
    throw new WireTransportError(
      'WIRE_FRAME_SIZE_EXCEEDED',
      `WireFrame payload size ${payloadLength} exceeds maximum limit of ${MAX_WIRE_FRAME_SIZE} bytes.`
    );
  }

  const checksum = computeWireFrameChecksum(options.payload);
  const timestamp = options.timestamp ?? Date.now();
  const frameId = options.frameId ?? computeWireFrameId('unbound', options.sequence, checksum);

  return Object.freeze({
    frameId,
    frameType: options.frameType,
    sequence: options.sequence,
    payloadLength,
    checksum,
    timestamp,
    payload: options.payload,
  });
}

export function serializeWireFrame(frame: WireFrame): string {
  validateWireFrame(frame);
  return JSON.stringify(frame);
}

export function deserializeWireFrame(raw: string): WireFrame {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw new WireTransportError('WIRE_MALFORMED_FRAME', 'Cannot deserialize empty or non-string wire frame.');
  }

  if (Buffer.byteLength(raw, 'utf8') > MAX_WIRE_FRAME_SIZE * 2) {
    throw new WireTransportError('WIRE_FRAME_SIZE_EXCEEDED', 'Raw frame buffer exceeds maximum transmission size.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new WireTransportError('WIRE_MALFORMED_FRAME', `Malformed JSON in wire frame: ${(err as Error).message}`);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new WireTransportError('WIRE_MALFORMED_FRAME', 'Deserialized wire frame is not an object.');
  }

  const candidate = parsed as Record<string, unknown>;
  if (
    typeof candidate.frameId !== 'string' ||
    typeof candidate.frameType !== 'string' ||
    typeof candidate.sequence !== 'number' ||
    typeof candidate.payloadLength !== 'number' ||
    typeof candidate.checksum !== 'string' ||
    typeof candidate.timestamp !== 'number' ||
    typeof candidate.payload !== 'string'
  ) {
    throw new WireTransportError('WIRE_MALFORMED_FRAME', 'Deserialized wire frame missing required envelope properties.');
  }

  const frame: WireFrame = Object.freeze({
    frameId: candidate.frameId,
    frameType: candidate.frameType as WireFrameType,
    sequence: candidate.sequence,
    payloadLength: candidate.payloadLength,
    checksum: candidate.checksum,
    timestamp: candidate.timestamp,
    payload: candidate.payload,
  });

  validateWireFrame(frame);
  return frame;
}

export function validateWireFrame(frame: WireFrame): void {
  if (!frame.frameId || typeof frame.frameId !== 'string') {
    throw new WireTransportError('WIRE_MALFORMED_FRAME', 'Wire frame frameId must be a valid string.');
  }
  if (!['HANDSHAKE', 'HANDSHAKE_ACK', 'DATA', 'HEARTBEAT', 'HEARTBEAT_ACK', 'BACKPRESSURE', 'CLOSE'].includes(frame.frameType)) {
    throw new WireTransportError('WIRE_MALFORMED_FRAME', `Unknown wire frameType "${frame.frameType}".`);
  }
  if (typeof frame.sequence !== 'number' || frame.sequence < 0) {
    throw new WireTransportError('WIRE_MALFORMED_FRAME', 'Wire frame sequence must be a non-negative integer.');
  }
  if (typeof frame.payload !== 'string') {
    throw new WireTransportError('WIRE_MALFORMED_FRAME', 'Wire frame payload must be a string.');
  }

  const actualLength = Buffer.byteLength(frame.payload, 'utf8');
  if (actualLength > MAX_WIRE_FRAME_SIZE) {
    throw new WireTransportError(
      'WIRE_FRAME_SIZE_EXCEEDED',
      `Wire frame payload length ${actualLength} exceeds ${MAX_WIRE_FRAME_SIZE} bytes.`
    );
  }

  const calculatedChecksum = computeWireFrameChecksum(frame.payload);
  if (calculatedChecksum !== frame.checksum) {
    throw new WireTransportError(
      'WIRE_CHECKSUM_MISMATCH',
      `Wire frame checksum mismatch! Expected ${frame.checksum}, got ${calculatedChecksum}. Fail-closed.`
    );
  }
}
