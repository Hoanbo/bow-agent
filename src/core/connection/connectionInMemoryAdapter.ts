// src/core/connection/connectionInMemoryAdapter.ts
// BOWCON V4.0 — REAL BIDIRECTIONAL SECURE CONNECTION & SESSION RUNTIME (MS-1.3.22)
//
// Invariants:
// - Zero real network I/O: zero sockets, zero HTTP listeners, zero WebSockets.
// - Pure deterministic in-memory adapter for unit testing, loopback, and regression testing.
// - Adapter is strictly a transport boundary: ZERO tool execution, ZERO cognitive mutation.

import type { ScopedConnectionIdentity } from './connectionTypes.js';
import type { ConnectionState } from './connectionStates.js';
import type { ConnectionMessage } from './connectionMessage.js';

export interface NetworkConnectionAdapter {
  readonly adapterId: string;
  readonly transportType: string;
  connect(identity: ScopedConnectionIdentity): Promise<void>;
  disconnect(connectionId: string): Promise<void>;
  send(message: ConnectionMessage): Promise<void>;
  onReceive(handler: (message: ConnectionMessage) => Promise<void> | void): void;
  onError(handler: (err: Error) => void): void;
  getStatus(connectionId: string): ConnectionState;
  dispose(): Promise<void>;
}

export class ConnectionInMemoryAdapter implements NetworkConnectionAdapter {
  public readonly adapterId: string;
  public readonly transportType = 'IN_MEMORY';

  private readonly statuses = new Map<string, ConnectionState>();
  private receiveHandler?: (message: ConnectionMessage) => Promise<void> | void;
  private errorHandler?: (err: Error) => void;
  private readonly sentMessages: ConnectionMessage[] = [];
  private isDisposed = false;

  constructor(adapterId = 'in_memory_adapter_01') {
    this.adapterId = adapterId;
  }

  public async connect(identity: ScopedConnectionIdentity): Promise<void> {
    if (this.isDisposed) {
      throw new Error(`[ADAPTER_ERROR] Cannot connect on disposed adapter ${this.adapterId}`);
    }
    this.statuses.set(identity.connectionId, 'CONNECTED');
  }

  public async disconnect(connectionId: string): Promise<void> {
    this.statuses.set(connectionId, 'DISCONNECTED');
  }

  public async send(message: ConnectionMessage): Promise<void> {
    if (this.isDisposed) {
      throw new Error(`[ADAPTER_ERROR] Cannot send on disposed adapter ${this.adapterId}`);
    }
    this.sentMessages.push(message);
  }

  /**
   * Simulates receiving a message into the runtime from the remote peer
   */
  public async simulateReceive(message: ConnectionMessage): Promise<void> {
    if (this.isDisposed) {
      throw new Error(`[ADAPTER_ERROR] Cannot simulate receive on disposed adapter ${this.adapterId}`);
    }
    if (this.receiveHandler) {
      await this.receiveHandler(message);
    }
  }

  /**
   * Simulates a transport-level error
   */
  public simulateError(err: Error): void {
    if (this.errorHandler) {
      this.errorHandler(err);
    }
  }

  public onReceive(handler: (message: ConnectionMessage) => Promise<void> | void): void {
    this.receiveHandler = handler;
  }

  public onError(handler: (err: Error) => void): void {
    this.errorHandler = handler;
  }

  public getStatus(connectionId: string): ConnectionState {
    return this.statuses.get(connectionId) || 'CLOSED';
  }

  public setStatus(connectionId: string, state: ConnectionState): void {
    this.statuses.set(connectionId, state);
  }

  public getSentMessages(): readonly ConnectionMessage[] {
    return Object.freeze([...this.sentMessages]);
  }

  public clearSentMessages(): void {
    this.sentMessages.length = 0;
  }

  public async dispose(): Promise<void> {
    this.isDisposed = true;
    this.statuses.clear();
    this.sentMessages.length = 0;
    this.receiveHandler = undefined;
    this.errorHandler = undefined;
  }
}
