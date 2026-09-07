// src/core/connection/connectionInMemoryAdapter.ts
// BOWCON V4.0 — REAL BIDIRECTIONAL SECURE CONNECTION & SESSION RUNTIME (MS-1.3.22)
//
// Invariants:
// - Zero real network I/O: zero sockets, zero HTTP listeners, zero WebSockets.
// - Pure deterministic in-memory adapter for unit testing, loopback, and regression testing.
// - Adapter is strictly a transport boundary: ZERO tool execution, ZERO cognitive mutation.
export class ConnectionInMemoryAdapter {
    adapterId;
    transportType = 'IN_MEMORY';
    statuses = new Map();
    receiveHandler;
    errorHandler;
    sentMessages = [];
    isDisposed = false;
    constructor(adapterId = 'in_memory_adapter_01') {
        this.adapterId = adapterId;
    }
    async connect(identity) {
        if (this.isDisposed) {
            throw new Error(`[ADAPTER_ERROR] Cannot connect on disposed adapter ${this.adapterId}`);
        }
        this.statuses.set(identity.connectionId, 'CONNECTED');
    }
    async disconnect(connectionId) {
        this.statuses.set(connectionId, 'DISCONNECTED');
    }
    async send(message) {
        if (this.isDisposed) {
            throw new Error(`[ADAPTER_ERROR] Cannot send on disposed adapter ${this.adapterId}`);
        }
        this.sentMessages.push(message);
    }
    /**
     * Simulates receiving a message into the runtime from the remote peer
     */
    async simulateReceive(message) {
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
    simulateError(err) {
        if (this.errorHandler) {
            this.errorHandler(err);
        }
    }
    onReceive(handler) {
        this.receiveHandler = handler;
    }
    onError(handler) {
        this.errorHandler = handler;
    }
    getStatus(connectionId) {
        return this.statuses.get(connectionId) || 'CLOSED';
    }
    setStatus(connectionId, state) {
        this.statuses.set(connectionId, state);
    }
    getSentMessages() {
        return Object.freeze([...this.sentMessages]);
    }
    clearSentMessages() {
        this.sentMessages.length = 0;
    }
    async dispose() {
        this.isDisposed = true;
        this.statuses.clear();
        this.sentMessages.length = 0;
        this.receiveHandler = undefined;
        this.errorHandler = undefined;
    }
}
