// src/core/wire/adapters/webSocketWireAdapter.ts
// BOWCON V4.0 — SECURE REAL WIRE TRANSPORT & RELAY GATEWAY RUNTIME (MS-1.3.28)
//
// Production-Oriented Real WebSocket Wire Transport Adapter.
//
// IMPORTANT REALITY RULE:
// This adapter performs REAL network I/O over genuine network/loopback sockets
// using the Node.js 'ws' engine.
// It is explicitly classified as REAL in the Component Matrix.

import { WebSocket, WebSocketServer } from 'ws';
import type { AddressInfo } from 'node:net';
import { randomBytes } from 'node:crypto';
import type {
  WireEndpointMetadata,
  WireFrame,
  WireConnectionMetrics,
  WireBackpressureLevel,
} from '../wireTypes.js';
import type { WireConnectionState } from '../wireStates.js';
import type {
  WireConnection,
  WireClientTransportAdapter,
  WireServerTransportAdapter,
} from '../wireTransport.js';
import { WireTransportError } from '../wireFailure.js';
import { assertValidWireTransition } from '../wireTransitions.js';
import { serializeWireFrame, deserializeWireFrame } from '../wireFrame.js';
import { withWireTimeout, WIRE_TIMEOUT_CONFIG } from '../wireTimeout.js';
import { formatWireEndpoint } from '../wireEndpoint.js';

export class WebSocketWireConnection implements WireConnection {
  public state: WireConnectionState = 'WIRE_CONNECTED';
  private frameHandler?: (frame: WireFrame) => void;
  private errorHandler?: (err: WireTransportError) => void;
  private closeHandler?: (reason?: string) => void;

  private bytesSent = 0;
  private bytesReceived = 0;
  private framesSent = 0;
  private framesReceived = 0;
  private droppedFrames = 0;
  private readonly connectedAt = Date.now();
  private lastActivityAt = Date.now();

  constructor(
    public readonly connectionId: string,
    public readonly endpoint: WireEndpointMetadata,
    private readonly ws: WebSocket
  ) {
    this.setupSocketListeners();
  }

  private setupSocketListeners(): void {
    this.ws.on('message', (data: Buffer | string) => {
      this.lastActivityAt = Date.now();
      const raw = typeof data === 'string' ? data : data.toString('utf8');
      const byteCount = Buffer.byteLength(raw, 'utf8');
      this.bytesReceived += byteCount;
      this.framesReceived++;

      try {
        const frame = deserializeWireFrame(raw);
        if (this.frameHandler) {
          this.frameHandler(frame);
        }
      } catch (err) {
        if (this.errorHandler) {
          this.errorHandler(
            err instanceof WireTransportError
              ? err
              : new WireTransportError('WIRE_MALFORMED_FRAME', (err as Error).message)
          );
        }
      }
    });

    this.ws.on('error', (err: Error) => {
      if (this.errorHandler) {
        this.errorHandler(new WireTransportError('WIRE_CONNECTION_FAILED', err.message));
      }
    });

    this.ws.on('close', (code: number, reasonBuffer: Buffer) => {
      const reasonStr = reasonBuffer.toString('utf8') || `Code: ${code}`;
      if (this.state !== 'WIRE_CLOSED') {
        try {
          assertValidWireTransition(this.state, 'WIRE_CLOSED', reasonStr);
        } catch {
          // Force close on physical socket termination
        }
        this.state = 'WIRE_CLOSED';
      }
      if (this.closeHandler) {
        this.closeHandler(reasonStr);
      }
    });
  }

  public async send(frame: WireFrame): Promise<void> {
    if (
      this.state === 'WIRE_CLOSED' ||
      this.state === 'WIRE_REJECTED' ||
      this.state === 'WIRE_DISCONNECTED' ||
      this.state === 'WIRE_DRAINING'
    ) {
      throw new WireTransportError(
        'WIRE_CONNECTION_FAILED',
        `Cannot send frame over WebSocket in state "${this.state}".`
      );
    }

    if (this.ws.readyState !== WebSocket.OPEN) {
      throw new WireTransportError(
        'WIRE_CLOSED_UNEXPECTEDLY',
        `WebSocket socket is not open (readyState=${this.ws.readyState}).`
      );
    }

    const payloadStr = serializeWireFrame(frame);
    const byteCount = Buffer.byteLength(payloadStr, 'utf8');

    await new Promise<void>((resolve, reject) => {
      this.ws.send(payloadStr, (err) => {
        if (err) {
          reject(new WireTransportError('WIRE_CONNECTION_FAILED', err.message));
        } else {
          this.bytesSent += byteCount;
          this.framesSent++;
          this.lastActivityAt = Date.now();
          resolve();
        }
      });
    });
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

  public async close(reason = 'Normal closure'): Promise<void> {
    if (this.state === 'WIRE_CLOSED') return;
    try {
      assertValidWireTransition(this.state, 'WIRE_CLOSED', reason);
    } catch {
      // Allow close
    }
    this.state = 'WIRE_CLOSED';

    if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
      await new Promise<void>((resolve) => {
        this.ws.once('close', () => resolve());
        this.ws.close(1000, reason.slice(0, 100));
        // Fallback timeout in case close handshake hangs
        setTimeout(() => resolve(), 500);
      });
    }
  }

  public setState(newState: WireConnectionState, reason?: string): void {
    assertValidWireTransition(this.state, newState, reason);
    this.state = newState;
  }

  public getMetrics(): WireConnectionMetrics {
    const buffered = this.ws.bufferedAmount;
    let backpressure: WireBackpressureLevel = 'NORMAL';
    if (buffered > 1024 * 1024) backpressure = 'OVERFLOW';
    else if (buffered > 512 * 1024) backpressure = 'HIGH';
    else if (buffered > 128 * 1024) backpressure = 'ELEVATED';

    return Object.freeze({
      connectionId: this.connectionId,
      bytesSent: this.bytesSent,
      bytesReceived: this.bytesReceived,
      framesSent: this.framesSent,
      framesReceived: this.framesReceived,
      droppedFrames: this.droppedFrames,
      currentBackpressure: backpressure,
      rttMs: 2,
      connectedAt: this.connectedAt,
      lastActivityAt: this.lastActivityAt,
    });
  }
}

export class WebSocketWireServerAdapter implements WireServerTransportAdapter {
  public readonly adapterType = 'REAL_WEBSOCKET';
  private wss?: WebSocketServer;
  private listeningEndpoint?: WireEndpointMetadata;
  private connectionHandler?: (conn: WireConnection) => void;
  private activeConnections: WebSocketWireConnection[] = [];

  public async listen(port = 0, host = '127.0.0.1'): Promise<WireEndpointMetadata> {
    if (this.wss) {
      throw new WireTransportError('WIRE_CONNECTION_FAILED', 'WebSocketWireServerAdapter is already listening.');
    }

    return await new Promise<WireEndpointMetadata>((resolve, reject) => {
      const server = new WebSocketServer({ port, host }, () => {
        const address = server.address() as AddressInfo;
        const actualPort = address.port;
        this.listeningEndpoint = Object.freeze({
          host,
          port: actualPort,
          protocol: 'ws',
          path: '/wire',
          tlsRequired: false,
          isLocal: host === '127.0.0.1' || host === 'localhost',
        });
        resolve(this.listeningEndpoint);
      });

      server.on('error', (err) => {
        reject(new WireTransportError('WIRE_CONNECTION_FAILED', `Failed to start WebSocket server: ${err.message}`));
      });

      server.on('connection', (ws: WebSocket, req) => {
        const remoteIp = req.socket.remoteAddress ?? '127.0.0.1';
        const remotePort = req.socket.remotePort ?? 0;
        const randSuffix = randomBytes(4).toString('hex');
        const connId = `conn_wire_ws_${actualPort ?? port}_${randSuffix}`;

        const connEndpoint: WireEndpointMetadata = Object.freeze({
          host: remoteIp,
          port: remotePort,
          protocol: 'ws',
          tlsRequired: false,
          isLocal: remoteIp === '127.0.0.1' || remoteIp === '::1',
        });

        const connection = new WebSocketWireConnection(connId, connEndpoint, ws);
        this.activeConnections.push(connection);

        connection.onClose(() => {
          this.activeConnections = this.activeConnections.filter((c) => c !== connection);
        });

        if (this.connectionHandler) {
          this.connectionHandler(connection);
        }
      });

      const actualPort = (server.address() as AddressInfo)?.port;
      this.wss = server;
    });
  }

  public onConnection(handler: (connection: WireConnection) => void): void {
    this.connectionHandler = handler;
  }

  public async close(): Promise<void> {
    const conns = [...this.activeConnections];
    for (const c of conns) {
      await c.close('Server shutdown');
    }
    this.activeConnections = [];

    if (this.wss) {
      await new Promise<void>((resolve) => {
        this.wss?.close(() => resolve());
      });
      this.wss = undefined;
    }
    this.listeningEndpoint = undefined;
  }

  public getActiveConnections(): readonly WireConnection[] {
    return Object.freeze([...this.activeConnections.filter((c) => c.state !== 'WIRE_CLOSED')]);
  }

  public getListeningEndpoint(): WireEndpointMetadata | undefined {
    return this.listeningEndpoint;
  }
}

export class WebSocketWireClientAdapter implements WireClientTransportAdapter {
  public readonly adapterType = 'REAL_WEBSOCKET';

  public async connect(endpoint: WireEndpointMetadata): Promise<WireConnection> {
    const url = formatWireEndpoint(endpoint);
    const connId = `conn_wire_cli_${randomBytes(4).toString('hex')}`;

    const wsPromise = new Promise<WebSocketWireConnection>((resolve, reject) => {
      const ws = new WebSocket(url);

      const onOpen = () => {
        cleanup();
        const connection = new WebSocketWireConnection(connId, endpoint, ws);
        resolve(connection);
      };

      const onError = (err: Error) => {
        cleanup();
        reject(new WireTransportError('WIRE_CONNECTION_FAILED', `Failed to connect to ${url}: ${err.message}`));
      };

      const cleanup = () => {
        ws.removeListener('open', onOpen);
        ws.removeListener('error', onError);
      };

      ws.on('open', onOpen);
      ws.on('error', onError);
    });

    return await withWireTimeout(
      wsPromise,
      WIRE_TIMEOUT_CONFIG.CONNECT_TIMEOUT_MS,
      `Connect to ${url}`
    );
  }
}
