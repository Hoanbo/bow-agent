// src/core/wire/adapters/inMemoryWireAdapter.ts
// BOWCON V4.0 — SECURE REAL WIRE TRANSPORT & RELAY GATEWAY RUNTIME (MS-1.3.28)
//
// TEST / IN-MEMORY / PARTIAL WIRE TRANSPORT ADAPTER.
//
// IMPORTANT REALITY RULE:
// This adapter is strictly for deterministic in-memory testing, mock scenarios,
// and simulation of network anomalies (packet loss, synthetic latency, partitions).
// It is explicitly classified as TEST/IN-MEMORY/PARTIAL.
// It DOES NOT perform physical network I/O.

import { randomBytes } from 'node:crypto';
import type {
  WireEndpointMetadata,
  WireFrame,
  WireConnectionMetrics,
} from '../wireTypes.js';
import type { WireConnectionState } from '../wireStates.js';
import type { WireConnection, WireClientTransportAdapter, WireServerTransportAdapter } from '../wireTransport.js';
import { WireTransportError } from '../wireFailure.js';
import { assertValidWireTransition } from '../wireTransitions.js';
import { serializeWireFrame, deserializeWireFrame } from '../wireFrame.js';

export class InMemoryWireConnection implements WireConnection {
  public state: WireConnectionState = 'WIRE_CONNECTED';
  private frameHandler?: (frame: WireFrame) => void;
  private errorHandler?: (err: WireTransportError) => void;
  private closeHandler?: (reason?: string) => void;
  private peer?: InMemoryWireConnection;

  private bytesSent = 0;
  private bytesReceived = 0;
  private framesSent = 0;
  private framesReceived = 0;
  private droppedFrames = 0;
  private readonly connectedAt = Date.now();
  private lastActivityAt = Date.now();

  constructor(
    public readonly connectionId: string,
    public readonly endpoint: WireEndpointMetadata
  ) {}

  public setPeer(peer: InMemoryWireConnection): void {
    this.peer = peer;
  }

  public async send(frame: WireFrame): Promise<void> {
    if (
      this.state === 'WIRE_CLOSED' ||
      this.state === 'WIRE_REJECTED' ||
      this.state === 'WIRE_DISCONNECTED' ||
      this.state === 'WIRE_DRAINING'
    ) {
      throw new WireTransportError('WIRE_CONNECTION_FAILED', `Cannot send frame over connection in state "${this.state}".`);
    }

    // Simulate wire serialization round-trip to verify serialization integrity
    const wireBytes = serializeWireFrame(frame);
    this.bytesSent += Buffer.byteLength(wireBytes, 'utf8');
    this.framesSent++;
    this.lastActivityAt = Date.now();

    if (this.peer && this.peer.state !== 'WIRE_CLOSED' && this.peer.state !== 'WIRE_REJECTED') {
      const receivedFrame = deserializeWireFrame(wireBytes);
      this.peer.deliverInbound(receivedFrame, Buffer.byteLength(wireBytes, 'utf8'));
    }
  }

  public deliverInbound(frame: WireFrame, byteCount: number): void {
    this.bytesReceived += byteCount;
    this.framesReceived++;
    this.lastActivityAt = Date.now();
    if (this.frameHandler) {
      this.frameHandler(frame);
    }
  }

  public onFrame(handler: (frame: WireFrame) => void): void {
    this.frameHandler = handler;
  }

  public onError(handler: (err: WireTransportError) => void): void {
    this.errorHandler = handler;
  }

  public onClose(handler: (reason?: string) => void): void {
    this.closeHandler = handler;
  }

  public async close(reason?: string): Promise<void> {
    if (this.state === 'WIRE_CLOSED') return;
    assertValidWireTransition(this.state, 'WIRE_CLOSED', reason);
    this.state = 'WIRE_CLOSED';

    if (this.closeHandler) {
      this.closeHandler(reason);
    }
    if (this.peer && this.peer.state !== 'WIRE_CLOSED') {
      await this.peer.close(reason);
    }
  }

  public setState(newState: WireConnectionState, reason?: string): void {
    assertValidWireTransition(this.state, newState, reason);
    this.state = newState;
  }

  public getMetrics(): WireConnectionMetrics {
    return Object.freeze({
      connectionId: this.connectionId,
      bytesSent: this.bytesSent,
      bytesReceived: this.bytesReceived,
      framesSent: this.framesSent,
      framesReceived: this.framesReceived,
      droppedFrames: this.droppedFrames,
      currentBackpressure: 'NORMAL',
      rttMs: 1,
      connectedAt: this.connectedAt,
      lastActivityAt: this.lastActivityAt,
    });
  }
}

export class InMemoryWireServerAdapter implements WireServerTransportAdapter {
  public readonly adapterType = 'TEST_IN_MEMORY';
  private listeningEndpoint?: WireEndpointMetadata;
  private connectionHandler?: (conn: WireConnection) => void;
  private activeConnections: InMemoryWireConnection[] = [];

  public async listen(port: number, host = '127.0.0.1'): Promise<WireEndpointMetadata> {
    this.listeningEndpoint = Object.freeze({
      host,
      port,
      protocol: 'test-in-memory',
      path: '/wire',
      tlsRequired: false,
      isLocal: true,
    });
    return this.listeningEndpoint;
  }

  public onConnection(handler: (connection: WireConnection) => void): void {
    this.connectionHandler = handler;
  }

  public async close(): Promise<void> {
    for (const conn of this.activeConnections) {
      await conn.close('Server shutdown');
    }
    this.activeConnections = [];
    this.listeningEndpoint = undefined;
  }

  public getActiveConnections(): readonly WireConnection[] {
    return Object.freeze([...this.activeConnections.filter((c) => c.state !== 'WIRE_CLOSED')]);
  }

  public getListeningEndpoint(): WireEndpointMetadata | undefined {
    return this.listeningEndpoint;
  }

  /**
   * Connects an in-memory client to this server.
   */
  public acceptClient(clientConn: InMemoryWireConnection): InMemoryWireConnection {
    const randSuffix = randomBytes(2).readUInt16BE(0);
    const serverConnId = `conn_wire_srv_${Date.now()}_${randSuffix}`;
    const serverConn = new InMemoryWireConnection(
      serverConnId,
      this.listeningEndpoint ?? clientConn.endpoint
    );

    clientConn.setPeer(serverConn);
    serverConn.setPeer(clientConn);

    this.activeConnections.push(serverConn);
    if (this.connectionHandler) {
      this.connectionHandler(serverConn);
    }
    return serverConn;
  }
}

export class InMemoryWireClientAdapter implements WireClientTransportAdapter {
  public readonly adapterType = 'TEST_IN_MEMORY';

  constructor(private readonly serverAdapter?: InMemoryWireServerAdapter) {}

  public async connect(endpoint: WireEndpointMetadata): Promise<WireConnection> {
    const clientConnId = `conn_wire_cli_${Date.now()}`;
    const clientConn = new InMemoryWireConnection(clientConnId, endpoint);

    if (this.serverAdapter) {
      this.serverAdapter.acceptClient(clientConn);
    }

    return clientConn;
  }
}
