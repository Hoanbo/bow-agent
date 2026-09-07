// src/core/network/networkInMemoryAdapter.ts
// BOWCON V4.0 — MILESTONE 1.3.21: DETERMINISTIC IN-MEMORY NETWORK ADAPTER
//
// EN:
// Authoritative in-memory network adapter implementation.
// Provides 100% deterministic frame transport for unit testing and local loopback integration.
// Strictly requires zero real OS network sockets, zero listeners, and zero daemons.
//
// VI:
// Triển khai bộ điều hợp mạng trong bộ nhớ tất định có thẩm quyền.
// Cung cấp truyền tải khung mạng tất định 100% cho kiểm thử đơn vị và tích hợp lặp nội bộ.
// Tuyệt đối không dùng socket mạng hệ điều hành thực, không listener và không daemon.
import { createNetworkConnectionSnapshot, updateNetworkConnectionSnapshot, } from './networkConnection.js';
import { NetworkCodec } from './networkCodec.js';
import { computeNetworkBackpressure, canAcceptNetworkFrame } from './networkBackpressure.js';
import { createNetworkOperationResult } from './networkResult.js';
import { createNetworkFailureDescriptor } from './networkError.js';
import { fnv1aHex } from './networkFingerprint.js';
import { validateScopedNetworkIdentity, deepFreeze } from './networkValidator.js';
export class NetworkInMemoryAdapter {
    adapterId;
    adapterType = 'IN_MEMORY';
    state = 'READY';
    codec = new NetworkCodec();
    maxQueueDepth;
    connections = new Map();
    frameQueues = new Map();
    totalSent = 0;
    totalReceived = 0;
    constructor(options) {
        const rawId = options?.adapterId ?? 'in_memory_primary';
        this.adapterId = `adp_${fnv1aHex(`IN_MEM_ADAPTER::${rawId}`)}`;
        this.maxQueueDepth = options?.maxQueueDepth ?? 1000;
    }
    getState() {
        return this.state;
    }
    async open(scope) {
        const validScope = validateScopedNetworkIdentity(scope);
        const connection = createNetworkConnectionSnapshot({
            scope: validScope,
            adapterType: this.adapterType,
            initialState: 'OPEN',
            initialSequence: 0,
            timestamp: 0,
        });
        this.connections.set(connection.networkConnectionId, connection);
        this.frameQueues.set(connection.networkConnectionId, []);
        return connection;
    }
    async close(connectionId, reason) {
        const existing = this.connections.get(connectionId);
        if (!existing)
            return;
        const closed = updateNetworkConnectionSnapshot(existing, {
            state: 'CLOSED',
        });
        this.connections.set(connectionId, closed);
    }
    async send(frame) {
        const conn = this.connections.get(frame.networkConnectionId);
        if (!conn) {
            const err = createNetworkFailureDescriptor({
                code: 'CONNECTION_CLOSED',
                message: `Cannot send frame: connection "${frame.networkConnectionId}" not found.`,
                frameId: frame.frameId,
                networkConnectionId: frame.networkConnectionId,
            });
            return createNetworkOperationResult({
                success: false,
                status: 'FAILED',
                networkConnectionId: frame.networkConnectionId,
                frameId: frame.frameId,
                error: err,
                timestamp: frame.timestamp,
            });
        }
        if (conn.state === 'CLOSED' || conn.state === 'FAILED') {
            const err = createNetworkFailureDescriptor({
                code: 'CONNECTION_CLOSED',
                message: `Cannot send frame: connection "${conn.networkConnectionId}" is in ${conn.state} state.`,
                frameId: frame.frameId,
                networkConnectionId: conn.networkConnectionId,
            });
            return createNetworkOperationResult({
                success: false,
                status: 'FAILED',
                networkConnectionId: conn.networkConnectionId,
                frameId: frame.frameId,
                error: err,
                timestamp: frame.timestamp,
            });
        }
        // Codec validation (deterministic serialization & integrity check)
        try {
            this.codec.validateDecodedFrame(frame);
        }
        catch (codecErr) {
            const err = createNetworkFailureDescriptor({
                code: 'MALFORMED_FRAME',
                message: `Codec validation failed: ${codecErr?.message}`,
                frameId: frame.frameId,
                networkConnectionId: conn.networkConnectionId,
            });
            return createNetworkOperationResult({
                success: false,
                status: 'REJECTED',
                networkConnectionId: conn.networkConnectionId,
                frameId: frame.frameId,
                error: err,
                timestamp: frame.timestamp,
            });
        }
        // Backpressure check
        const queue = this.frameQueues.get(frame.networkConnectionId) ?? [];
        const metrics = computeNetworkBackpressure({
            pendingFrames: queue.length,
            maxCapacity: this.maxQueueDepth,
        });
        if (!canAcceptNetworkFrame(metrics)) {
            const err = createNetworkFailureDescriptor({
                code: 'NETWORK_BACKPRESSURE_BLOCKED',
                message: `Network queue saturated (${metrics.pendingFrames}/${metrics.maxCapacity}). Frame rejected.`,
                frameId: frame.frameId,
                networkConnectionId: conn.networkConnectionId,
            });
            return createNetworkOperationResult({
                success: false,
                status: 'RATE_LIMITED',
                networkConnectionId: conn.networkConnectionId,
                frameId: frame.frameId,
                error: err,
                timestamp: frame.timestamp,
            });
        }
        // Deliver into in-memory queue
        queue.push(frame);
        this.frameQueues.set(frame.networkConnectionId, queue);
        this.totalSent++;
        // Update connection snapshot
        const updated = updateNetworkConnectionSnapshot(conn, {
            state: 'ACTIVE',
            lastSentSequence: Math.max(conn.lastSentSequence, frame.sequence),
            pendingFrameCount: queue.length,
            timestamp: frame.timestamp,
        });
        this.connections.set(conn.networkConnectionId, updated);
        return createNetworkOperationResult({
            success: true,
            status: 'ACCEPTED',
            networkConnectionId: conn.networkConnectionId,
            frameId: frame.frameId,
            timestamp: frame.timestamp,
        });
    }
    async receive(connectionId) {
        const conn = this.connections.get(connectionId);
        if (!conn)
            return undefined;
        const queue = this.frameQueues.get(connectionId);
        if (!queue || queue.length === 0)
            return undefined;
        const frame = queue.shift();
        this.totalReceived++;
        const updated = updateNetworkConnectionSnapshot(conn, {
            lastReceivedSequence: Math.max(conn.lastReceivedSequence, frame.sequence),
            pendingFrameCount: queue.length,
        });
        this.connections.set(connectionId, updated);
        return frame;
    }
    getConnection(connectionId) {
        return this.connections.get(connectionId);
    }
    getHealth() {
        if (this.state === 'FAILED')
            return 'UNRESPONSIVE';
        if (this.state === 'PAUSED')
            return 'DEGRADED';
        return 'HEALTHY';
    }
    getMetrics() {
        return deepFreeze({
            totalSent: this.totalSent,
            totalReceived: this.totalReceived,
            activeConnections: this.connections.size,
        });
    }
}
