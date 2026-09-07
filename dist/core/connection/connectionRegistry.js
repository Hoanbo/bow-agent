// src/core/connection/connectionRegistry.ts
// BOWCON V4.0 — REAL BIDIRECTIONAL SECURE CONNECTION & SESSION RUNTIME (MS-1.3.22)
//
// 8-tuple isolated registry for connections, sessions, peers, and adapters.
import { assertConnectionScopeMatch, createConnectionScope } from './connectionScope.js';
export class ConnectionRegistry {
    connections = new Map();
    peers = new Map();
    adapterBindings = new Map();
    surfaceToConnection = new Map(); // surfaceId -> connectionId
    /**
     * Registers or updates a connection session snapshot
     */
    registerConnection(snapshot) {
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
    getConnection(connectionId, expectedScope) {
        const conn = this.connections.get(connectionId);
        if (!conn)
            return undefined;
        if (expectedScope) {
            assertConnectionScopeMatch(expectedScope, conn.scopeIdentity);
        }
        return conn;
    }
    /**
     * Registers a peer identity
     */
    registerPeer(peer) {
        this.peers.set(peer.peerId, peer);
    }
    /**
     * Retrieves a peer by ID, enforcing expected scope
     */
    getPeer(peerId, expectedScope) {
        const peer = this.peers.get(peerId);
        if (!peer)
            return undefined;
        if (expectedScope) {
            assertConnectionScopeMatch(expectedScope, peer.scopeIdentity);
        }
        return peer;
    }
    /**
     * Registers an adapter binding
     */
    registerAdapterBinding(binding) {
        this.adapterBindings.set(binding.adapterId, binding);
    }
    /**
     * Retrieves an adapter binding
     */
    getAdapterBinding(adapterId) {
        return this.adapterBindings.get(adapterId);
    }
    /**
     * Finds connection ID for a given surface
     */
    getConnectionForSurface(surfaceId) {
        return this.surfaceToConnection.get(surfaceId);
    }
    /**
     * Removes a connection from the registry
     */
    removeConnection(connectionId) {
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
    get connectionCount() {
        return this.connections.size;
    }
    clear() {
        this.connections.clear();
        this.peers.clear();
        this.adapterBindings.clear();
        this.surfaceToConnection.clear();
    }
}
