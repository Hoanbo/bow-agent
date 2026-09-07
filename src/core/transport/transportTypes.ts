// src/core/transport/transportTypes.ts
// BOWCON V4.0 — MILESTONE 1.3.19: BRAIN MESSAGE TRANSPORT & REMOTE CONNECTIVITY CONTRACTS
//
// EN:
// Authoritative transport message taxonomy, transport directions, typed failure codes,
// canonical message envelope contract, and transport adapter contracts.
//
// VI:
// Phân loại thông điệp truyền tải có thẩm quyền, hướng truyền tải, mã lỗi định kiểu,
// hợp đồng phong bì thông điệp chuẩn mực, và các hợp đồng adapter truyền tải.

import type { PlanRiskLevel } from '../planning/planningTypes.js';

export type { PlanRiskLevel };

/**
 * EN: Authoritative transport message taxonomy.
 * VI: Phân loại thông điệp truyền tải có thẩm quyền.
 */
export type TransportMessageType =
  | 'REQUEST'
  | 'RESPONSE'
  | 'EVENT'
  | 'ACK'
  | 'NACK'
  | 'HEARTBEAT'
  | 'HEARTBEAT_ACK'
  | 'CONNECT'
  | 'CONNECT_ACK'
  | 'DISCONNECT'
  | 'RECONNECT'
  | 'RESUME'
  | 'RESUME_ACK'
  | 'ERROR'
  | 'FLOW_CONTROL'
  | 'DELIVERY_STATUS';

export const ALL_TRANSPORT_MESSAGE_TYPES: ReadonlySet<TransportMessageType> = Object.freeze(
  new Set<TransportMessageType>([
    'REQUEST',
    'RESPONSE',
    'EVENT',
    'ACK',
    'NACK',
    'HEARTBEAT',
    'HEARTBEAT_ACK',
    'CONNECT',
    'CONNECT_ACK',
    'DISCONNECT',
    'RECONNECT',
    'RESUME',
    'RESUME_ACK',
    'ERROR',
    'FLOW_CONTROL',
    'DELIVERY_STATUS',
  ]),
);

/**
 * EN: Explicit transport direction between Brain and remote surface.
 * VI: Hướng truyền tải tường minh giữa Não bộ và bề mặt từ xa.
 */
export type TransportDirection = 'BRAIN_TO_SURFACE' | 'SURFACE_TO_BRAIN';

export const ALL_TRANSPORT_DIRECTIONS: ReadonlySet<TransportDirection> = Object.freeze(
  new Set<TransportDirection>(['BRAIN_TO_SURFACE', 'SURFACE_TO_BRAIN']),
);

/**
 * EN: Canonical error / rejection codes for transport and delivery failures.
 * VI: Mã lỗi / từ chối chuẩn mực cho các thất bại truyền tải và phân phối.
 */
export type TransportFailureCode =
  | 'INVALID_MESSAGE'
  | 'INVALID_SCOPE'
  | 'INVALID_SEQUENCE'
  | 'SEQUENCE_GAP'
  | 'REPLAY_DETECTED'
  | 'REPLAY_CONFLICT'
  | 'CONNECTION_FAILURE'
  | 'DELIVERY_TIMEOUT'
  | 'SURFACE_UNAVAILABLE'
  | 'TRANSPORT_UNAVAILABLE'
  | 'BACKPRESSURE'
  | 'PROTOCOL_VIOLATION'
  | 'AUTHENTICATION_FAILURE'
  | 'AUTHORIZATION_FAILURE'
  | 'MESSAGE_TOO_LARGE'
  | 'UNSUPPORTED_MESSAGE_TYPE'
  | 'INVALID_CORRELATION'
  | 'STALE_MESSAGE'
  | 'INTERNAL_TRANSPORT_FAILURE';

/**
 * EN: Canonical immutable BrainTransportMessage envelope contract.
 * VI: Hợp đồng phong bì BrainTransportMessage bất biến chuẩn mực.
 */
export interface BrainTransportMessage {
  readonly messageId: string;
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
  readonly payload: Readonly<Record<string, unknown>>;
  readonly riskLevel?: PlanRiskLevel;
  readonly governanceMetadata?: Readonly<Record<string, unknown>>;
  readonly lifecycleMetadata?: Readonly<Record<string, unknown>>;
  readonly timestamp: number;
  readonly fingerprint: string;
}

/**
 * EN: Parameters to construct a BrainTransportMessage envelope.
 * VI: Các tham số để khởi tạo phong bì BrainTransportMessage.
 */
export interface CreateTransportMessageParams {
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
  readonly riskLevel?: PlanRiskLevel;
  readonly governanceMetadata?: Readonly<Record<string, unknown>>;
  readonly lifecycleMetadata?: Readonly<Record<string, unknown>>;
  readonly timestamp?: number;
}

/**
 * EN: Transport-neutral adapter contract for future physical or remote transports.
 * VI: Hợp đồng adapter trung lập truyền tải cho các phương thức truyền tải vật lý hoặc từ xa trong tương lai.
 */
export interface TransportAdapter {
  readonly transportId: string;
  readonly transportType: string;
  send(message: BrainTransportMessage): Promise<{ success: boolean; error?: string }>;
  close(): Promise<void>;
}

/**
 * EN: Gateway contract defining the boundary between the Brain and remote message transport.
 * VI: Hợp đồng Gateway xác định ranh giới giữa Não bộ và tầng truyền tải thông điệp từ xa.
 */
export interface TransportGatewayContract {
  dispatchMessage(message: BrainTransportMessage): Promise<boolean>;
  receiveMessage(message: BrainTransportMessage): Promise<boolean>;
}
