// src/core/relay/relayConnection.ts
// BOWCON V4.0 — SECURE ALWAYS-ON BRAIN RELAY & REMOTE SESSION RUNTIME (MS-1.3.27)
//
// Protocol-independent transport connection abstraction.
//
// INVARIANTS:
// - Adapter architecture decouples core logic from physical wire protocols.
// - In-memory adapter is strictly for tests and local verification.

import type { RelayEndpointMetadata, RelayMessage } from './relayTypes.js';

export interface RelayTransportAdapter {
  readonly adapterType: 'TEST_IN_MEMORY' | 'WEBSOCKET_CLIENT' | 'QUIC_CLIENT' | 'TCP_CLIENT';
  open(endpoint: RelayEndpointMetadata): Promise<void>;
  close(): Promise<void>;
  send(message: RelayMessage): Promise<void>;
  onMessage(handler: (msg: RelayMessage) => void): void;
  isConnected(): boolean;
}

/**
 * TEST / IN-MEMORY transport adapter.
 * NOT a production network socket or internet tunnel.
 */
export class InMemoryRelayTransportAdapter implements RelayTransportAdapter {
  public readonly adapterType = 'TEST_IN_MEMORY';
  private connected: boolean = false;
  private messageHandler?: (msg: RelayMessage) => void;
  public sentMessages: RelayMessage[] = [];

  public async open(_endpoint: RelayEndpointMetadata): Promise<void> {
    this.connected = true;
  }

  public async close(): Promise<void> {
    this.connected = false;
  }

  public async send(message: RelayMessage): Promise<void> {
    if (!this.connected) {
      throw new Error('TRANSPORT_NOT_CONNECTED: Cannot send message over closed in-memory adapter.');
    }
    this.sentMessages.push(Object.freeze({ ...message }));
  }

  public onMessage(handler: (msg: RelayMessage) => void): void {
    this.messageHandler = handler;
  }

  public isConnected(): boolean {
    return this.connected;
  }

  /**
   * Helper for testing inbound message reception.
   */
  public receiveInbound(msg: RelayMessage): void {
    if (this.messageHandler) {
      this.messageHandler(msg);
    }
  }

  public clear(): void {
    this.sentMessages = [];
  }
}

/**
 * Encapsulates a transport connection instance.
 */
export class RelayConnection {
  private connected: boolean = false;
  private bytesSent: number = 0;
  private bytesReceived: number = 0;
  private openedAt?: number;
  private closedAt?: number;

  constructor(
    public readonly connectionId: string,
    public readonly endpoint: RelayEndpointMetadata,
    private readonly adapter: RelayTransportAdapter
  ) {}

  public async connect(): Promise<void> {
    await this.adapter.open(this.endpoint);
    this.connected = true;
    this.openedAt = Date.now();
  }

  public async disconnect(): Promise<void> {
    await this.adapter.close();
    this.connected = false;
    this.closedAt = Date.now();
  }

  public isConnected(): boolean {
    return this.connected && this.adapter.isConnected();
  }

  public async send(message: RelayMessage): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('RELAY_CONNECTION_CLOSED: Cannot send over closed connection.');
    }
    await this.adapter.send(message);
    this.bytesSent += JSON.stringify(message).length;
  }

  public onMessage(handler: (msg: RelayMessage) => void): void {
    this.adapter.onMessage((msg) => {
      this.bytesReceived += JSON.stringify(msg).length;
      handler(msg);
    });
  }

  public getStats() {
    return {
      connectionId: this.connectionId,
      connected: this.isConnected(),
      bytesSent: this.bytesSent,
      bytesReceived: this.bytesReceived,
      openedAt: this.openedAt,
      closedAt: this.closedAt,
    };
  }
}
