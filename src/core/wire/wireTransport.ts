// src/core/wire/wireTransport.ts
// BOWCON V4.0 — SECURE REAL WIRE TRANSPORT & RELAY GATEWAY RUNTIME (MS-1.3.28)
//
// Protocol-Neutral Transport Abstraction Contracts.
//
// Strictly decouples the BOWCON architecture from specific physical wire protocols
// (WebSocket, TCP, QUIC, etc.) behind unified transport adapters.

import type {
  WireEndpointMetadata,
  WireFrame,
  WireConnectionMetrics,
  WireTransportType,
} from './wireTypes.js';
import type { WireConnectionState } from './wireStates.js';
import type { WireTransportError } from './wireFailure.js';

/**
 * Bidirectional physical wire connection contract.
 */
export interface WireConnection {
  readonly connectionId: string;
  readonly state: WireConnectionState;
  readonly endpoint: WireEndpointMetadata;

  send(frame: WireFrame): Promise<void>;
  onFrame(handler: (frame: WireFrame) => void): void;
  onError(handler: (err: WireTransportError) => void): void;
  onClose(handler: (reason?: string) => void): void;
  close(reason?: string): Promise<void>;
  getMetrics(): WireConnectionMetrics;
}

/**
 * Client-side transport adapter contract for establishing outbound wire connections.
 */
export interface WireClientTransportAdapter {
  readonly adapterType: WireTransportType;
  connect(endpoint: WireEndpointMetadata): Promise<WireConnection>;
}

/**
 * Server/Gateway transport adapter contract for accepting inbound wire connections.
 */
export interface WireServerTransportAdapter {
  readonly adapterType: WireTransportType;
  listen(port: number, host?: string): Promise<WireEndpointMetadata>;
  onConnection(handler: (connection: WireConnection) => void): void;
  close(): Promise<void>;
  getActiveConnections(): readonly WireConnection[];
  getListeningEndpoint(): WireEndpointMetadata | undefined;
}
