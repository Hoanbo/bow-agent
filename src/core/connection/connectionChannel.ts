// src/core/connection/connectionChannel.ts
// BOWCON V4.0 — REAL BIDIRECTIONAL SECURE CONNECTION & SESSION RUNTIME (MS-1.3.22)
//
// Logical bidirectional channels preventing accidental semantic mixing across frames.

import type { ConnectionChannel, ConnectionMessageType } from './connectionTypes.js';

export const CHANNELS: readonly ConnectionChannel[] = Object.freeze([
  'CONTROL',
  'EVENT',
  'REQUEST',
  'RESPONSE',
  'ACK',
  'HEARTBEAT',
  'ERROR',
]);

export const CHANNEL_MESSAGE_MAP: Readonly<Record<ConnectionChannel, readonly ConnectionMessageType[]>> = Object.freeze({
  CONTROL: Object.freeze<ConnectionMessageType[]>([
    'HELLO',
    'CAPABILITY_OFFER',
    'CAPABILITY_ACCEPT',
    'AUTH_REQUEST',
    'AUTH_RESULT',
    'SESSION_ESTABLISHED',
    'READY',
    'DISCONNECT',
    'CLOSE',
  ]),
  EVENT: Object.freeze<ConnectionMessageType[]>([
    'EVENT',
    'STATUS',
    'SCREEN_CAPTURE_READY',
    'SCREEN_CAPTURE_FAILED',
    'SCREEN_DESCRIPTION_READY',
    'RECEIVE_ROBOT_STATUS',
    'RECEIVE_DEVICE_STATUS',
  ]),
  REQUEST: Object.freeze<ConnectionMessageType[]>([
    'REQUEST',
    'REQUEST_SCREEN_CAPTURE',
    'REQUEST_SCREEN_DESCRIPTION',
    'REQUEST_ROBOT_STATUS',
    'REQUEST_ROBOT_ACTION',
    'REQUEST_DEVICE_STATUS',
    'RECONNECT_REQUEST',
  ]),
  RESPONSE: Object.freeze<ConnectionMessageType[]>(['RESPONSE']),
  ACK: Object.freeze<ConnectionMessageType[]>(['ACK', 'NACK', 'RECONNECT_ACK']),
  HEARTBEAT: Object.freeze<ConnectionMessageType[]>(['HEARTBEAT_SIGNAL', 'HEARTBEAT_ACK']),
  ERROR: Object.freeze<ConnectionMessageType[]>(['ERROR']),
});

/**
 * Validates whether a message type is permissible on a specific channel
 */
export function isValidChannelForMessageType(channel: ConnectionChannel, msgType: ConnectionMessageType): boolean {
  const allowed = CHANNEL_MESSAGE_MAP[channel];
  return allowed ? allowed.includes(msgType) : false;
}

/**
 * Asserts valid channel mapping, failing closed on mismatch
 */
export function assertValidChannelMapping(channel: ConnectionChannel, msgType: ConnectionMessageType): void {
  if (!isValidChannelForMessageType(channel, msgType)) {
    throw new Error(`[CONNECTION_CHANNEL_ERROR] Message type '${msgType}' is forbidden on channel '${channel}'`);
  }
}
