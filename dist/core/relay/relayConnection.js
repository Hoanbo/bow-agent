// src/core/relay/relayConnection.ts
// BOWCON V4.0 — SECURE ALWAYS-ON BRAIN RELAY & REMOTE SESSION RUNTIME (MS-1.3.27)
//
// Protocol-independent transport connection abstraction.
//
// INVARIANTS:
// - Adapter architecture decouples core logic from physical wire protocols.
// - In-memory adapter is strictly for tests and local verification.
/**
 * TEST / IN-MEMORY transport adapter.
 * NOT a production network socket or internet tunnel.
 */
export class InMemoryRelayTransportAdapter {
    adapterType = 'TEST_IN_MEMORY';
    connected = false;
    messageHandler;
    sentMessages = [];
    async open(_endpoint) {
        this.connected = true;
    }
    async close() {
        this.connected = false;
    }
    async send(message) {
        if (!this.connected) {
            throw new Error('TRANSPORT_NOT_CONNECTED: Cannot send message over closed in-memory adapter.');
        }
        this.sentMessages.push(Object.freeze({ ...message }));
    }
    onMessage(handler) {
        this.messageHandler = handler;
    }
    isConnected() {
        return this.connected;
    }
    /**
     * Helper for testing inbound message reception.
     */
    receiveInbound(msg) {
        if (this.messageHandler) {
            this.messageHandler(msg);
        }
    }
    clear() {
        this.sentMessages = [];
    }
}
/**
 * Encapsulates a transport connection instance.
 */
export class RelayConnection {
    connectionId;
    endpoint;
    adapter;
    connected = false;
    bytesSent = 0;
    bytesReceived = 0;
    openedAt;
    closedAt;
    constructor(connectionId, endpoint, adapter) {
        this.connectionId = connectionId;
        this.endpoint = endpoint;
        this.adapter = adapter;
    }
    async connect() {
        await this.adapter.open(this.endpoint);
        this.connected = true;
        this.openedAt = Date.now();
    }
    async disconnect() {
        await this.adapter.close();
        this.connected = false;
        this.closedAt = Date.now();
    }
    isConnected() {
        return this.connected && this.adapter.isConnected();
    }
    async send(message) {
        if (!this.isConnected()) {
            throw new Error('RELAY_CONNECTION_CLOSED: Cannot send over closed connection.');
        }
        await this.adapter.send(message);
        this.bytesSent += JSON.stringify(message).length;
    }
    onMessage(handler) {
        this.adapter.onMessage((msg) => {
            this.bytesReceived += JSON.stringify(msg).length;
            handler(msg);
        });
    }
    getStats() {
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
