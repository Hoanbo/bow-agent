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
import { WireTransportError } from '../wireFailure.js';
import { assertValidWireTransition } from '../wireTransitions.js';
import { serializeWireFrame, deserializeWireFrame } from '../wireFrame.js';
export class InMemoryWireConnection {
    connectionId;
    endpoint;
    state = 'WIRE_CONNECTED';
    frameHandler;
    errorHandler;
    closeHandler;
    peer;
    bytesSent = 0;
    bytesReceived = 0;
    framesSent = 0;
    framesReceived = 0;
    droppedFrames = 0;
    connectedAt = Date.now();
    lastActivityAt = Date.now();
    constructor(connectionId, endpoint) {
        this.connectionId = connectionId;
        this.endpoint = endpoint;
    }
    setPeer(peer) {
        this.peer = peer;
    }
    async send(frame) {
        if (this.state === 'WIRE_CLOSED' ||
            this.state === 'WIRE_REJECTED' ||
            this.state === 'WIRE_DISCONNECTED' ||
            this.state === 'WIRE_DRAINING') {
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
    deliverInbound(frame, byteCount) {
        this.bytesReceived += byteCount;
        this.framesReceived++;
        this.lastActivityAt = Date.now();
        if (this.frameHandler) {
            this.frameHandler(frame);
        }
    }
    onFrame(handler) {
        this.frameHandler = handler;
    }
    onError(handler) {
        this.errorHandler = handler;
    }
    onClose(handler) {
        this.closeHandler = handler;
    }
    async close(reason) {
        if (this.state === 'WIRE_CLOSED')
            return;
        assertValidWireTransition(this.state, 'WIRE_CLOSED', reason);
        this.state = 'WIRE_CLOSED';
        if (this.closeHandler) {
            this.closeHandler(reason);
        }
        if (this.peer && this.peer.state !== 'WIRE_CLOSED') {
            await this.peer.close(reason);
        }
    }
    setState(newState, reason) {
        assertValidWireTransition(this.state, newState, reason);
        this.state = newState;
    }
    getMetrics() {
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
export class InMemoryWireServerAdapter {
    adapterType = 'TEST_IN_MEMORY';
    listeningEndpoint;
    connectionHandler;
    activeConnections = [];
    async listen(port, host = '127.0.0.1') {
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
    onConnection(handler) {
        this.connectionHandler = handler;
    }
    async close() {
        for (const conn of this.activeConnections) {
            await conn.close('Server shutdown');
        }
        this.activeConnections = [];
        this.listeningEndpoint = undefined;
    }
    getActiveConnections() {
        return Object.freeze([...this.activeConnections.filter((c) => c.state !== 'WIRE_CLOSED')]);
    }
    getListeningEndpoint() {
        return this.listeningEndpoint;
    }
    /**
     * Connects an in-memory client to this server.
     */
    acceptClient(clientConn) {
        const randSuffix = randomBytes(2).readUInt16BE(0);
        const serverConnId = `conn_wire_srv_${Date.now()}_${randSuffix}`;
        const serverConn = new InMemoryWireConnection(serverConnId, this.listeningEndpoint ?? clientConn.endpoint);
        clientConn.setPeer(serverConn);
        serverConn.setPeer(clientConn);
        this.activeConnections.push(serverConn);
        if (this.connectionHandler) {
            this.connectionHandler(serverConn);
        }
        return serverConn;
    }
}
export class InMemoryWireClientAdapter {
    serverAdapter;
    adapterType = 'TEST_IN_MEMORY';
    constructor(serverAdapter) {
        this.serverAdapter = serverAdapter;
    }
    async connect(endpoint) {
        const clientConnId = `conn_wire_cli_${Date.now()}`;
        const clientConn = new InMemoryWireConnection(clientConnId, endpoint);
        if (this.serverAdapter) {
            this.serverAdapter.acceptClient(clientConn);
        }
        return clientConn;
    }
}
