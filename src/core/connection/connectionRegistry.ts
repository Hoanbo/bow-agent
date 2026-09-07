// src/core/connection/connectionRegistry.ts
// BOWCON V4.0 — REAL BIDIRECTIONAL SECURE CONNECTION & SESSION RUNTIME (MS-1.3.22)
//
// 8-tuple isolated registry for connections, sessions, peers, and adapters.

import type { ScopedConnectionIdentity } from './connectionTypes.js';
import type { ConnectionSessionSnapshot } from './connectionSession.js';
import { assertConnectionScopeMatch, createConnectionScope } from './connectionScope.js';

export interface RegisteredPeer {
  readonly peerId: string;
  readonly scopeIdentity: ScopedConnectionIdentity;
  readonly role: string;
  readonly registeredAt: string;
}

export interface RegisteredAdapterBinding {
  readonly adapterId: string;
  readonly transportType: string;
  readonly supportedSurfaces: readonly string[];
  readonly registeredAt: string;
}

export class ConnectionRegistry {
  private readonly connections = new Map<string, ConnectionSessionSnapshot>();
  private readonly peers = new Map<string, RegisteredPeer>();
  private readonly adapterBindings = new Map<string, RegisteredAdapterBinding>();
  private readonly surfaceToConnection = new Map<string, string>(); // surfaceId -> connectionId

  /**
   * Registers or updates a connection session snapshot
   */
  public registerConnection(snapshot: ConnectionSessionSnapshot): void {
    const scopeStr = createConnectionScope(snapshot.scopeIdentity);
    const existing = this.connections.get(snapshot.connectionId);
    if (existing) {
      assertConnectionScopeMatch(existing.scopeIdentity, snapshot.scopeIdentity);
    }
    this.connections.set(snapshot.connectionId, snapshot);
    this.surfaceToConnection.set(snapshot.scopeIdentity.surfaceId, snapshot.connectionId);
  }

  /**
   * Retrieves a connection session snapshot by connectionId, enforcing expected scope
   */
  public getConnection(connectionId: string, expectedScope?: ScopedConnectionIdentity): ConnectionSessionSnapshot | undefined {
    const conn = this.connections.get(connectionId);
    if (!conn) return undefined;
    if (expectedScope) {
      assertConnectionScopeMatch(expectedScope, conn.scopeIdentity);
    }
    return conn;
  }

  /**
   * Registers a peer identity
   */
  public registerPeer(peer: RegisteredPeer): void {
    this.peers.set(peer.peerId, peer);
  }

  /**
   * Retrieves a peer by ID, enforcing expected scope
   */
  public getPeer(peerId: string, expectedScope?: ScopedConnectionIdentity): RegisteredPeer | undefined {
    const peer = this.peers.get(peerId);
    if (!peer) return undefined;
    if (expectedScope) {
      assertConnectionScopeMatch(expectedScope, peer.scopeIdentity);
    }
    return peer;
  }

  /**
   * Registers an adapter binding
   */
  public registerAdapterBinding(binding: RegisteredAdapterBinding): void {
    this.adapterBindings.set(binding.adapterId, binding);
  }

  /**
   * Retrieves an adapter binding
   */
  public getAdapterBinding(adapterId: string): RegisteredAdapterBinding | undefined {
    return this.adapterBindings.get(adapterId);
  }

  /**
   * Finds connection ID for a given surface
   */
  public getConnectionForSurface(surfaceId: string): string | undefined {
    return this.surfaceToConnection.get(surfaceId);
  }

  /**
   * Removes a connection from the registry
   */
  public removeConnection(connectionId: string): boolean {
    const conn = this.connections.get(connectionId);
    if (conn) {
      this.surfaceToConnection.delete(conn.scopeIdentity.surfaceId);
      return this.connections.delete(connectionId);
    }
    return false;
  }

  /**
   * Total registered connection count
   */
  public get connectionCount(): number {
    return this.connections.size;
  }

  public clear(): void {
    this.connections.clear();
    this.peers.clear();
    this.adapterBindings.clear();
    this.surfaceToConnection.clear();
  }
}
