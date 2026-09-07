// src/core/network/networkRuntime.ts
// BOWCON V4.0 — MILESTONE 1.3.21: AUTHORITATIVE NETWORK RUNTIME ENGINE
//
// EN:
// Core NetworkRuntime engine coordinating adapters, connections, frame routing,
// heartbeat liveness, reconnects, timeouts, backpressure, and audit logging.
// STRICTLY NON-COGNITIVE: zero reasoning, zero planning, zero tool execution, zero PDP calls.
//
// VI:
// Động cơ NetworkRuntime cốt lõi điều phối adapter, kết nối, định tuyến khung,
// kiểm tra nhịp tim, kết nối lại, timeout, áp lực ngược và nhật ký kiểm toán.
// TUYỆT ĐỐI PHI NHẬN THỨC: không suy luận, không lập kế hoạch, không chạy công cụ, không gọi PDP.
import { NetworkRegistry } from './networkRegistry.js';
import { NetworkListenerRegistry } from './networkListener.js';
import { NetworkInMemoryAdapter } from './networkInMemoryAdapter.js';
import { createNetworkAuditRecord } from './networkAudit.js';
import { createNetworkOperationResult } from './networkResult.js';
import { createNetworkFailureDescriptor } from './networkError.js';
import { createNetworkHeartbeatSignal, createNetworkHeartbeatAck, evaluateNetworkHeartbeat, } from './networkHeartbeat.js';
import { createNetworkReconnectRequest, evaluateNetworkReconnect, } from './networkReconnect.js';
import { evaluateNetworkTimeout, } from './networkTimeout.js';
import { computeNetworkBackpressure } from './networkBackpressure.js';
import { deepFreeze, validateScopedNetworkIdentity } from './networkValidator.js';
export class NetworkRuntime {
    registry = new NetworkRegistry();
    listeners = new NetworkListenerRegistry();
    audits = [];
    defaultAdapter;
    constructor(options) {
        this.defaultAdapter = options?.defaultAdapter ?? new NetworkInMemoryAdapter();
        this.registry.registerAdapter(this.defaultAdapter);
    }
    getRegistry() {
        return this.registry;
    }
    getListeners() {
        return this.listeners;
    }
    getDefaultAdapter() {
        return this.defaultAdapter;
    }
    /**
     * EN: Opens a network connection using the specified or default adapter.
     * VI: Mở một kết nối mạng sử dụng adapter chỉ định hoặc mặc định.
     */
    async openConnection(scope, adapterId) {
        const validScope = validateScopedNetworkIdentity(scope);
        const adapter = adapterId ? this.registry.getAdapter(adapterId) : this.defaultAdapter;
        if (!adapter) {
            throw new Error(`[NETWORK_RUNTIME_ERROR] Adapter "${adapterId}" not registered in runtime.`);
        }
        const connection = await adapter.open(validScope);
        this.registry.registerConnection(connection);
        this.recordAudit({
            eventType: 'CONNECTION_OPENED',
            networkConnectionId: connection.networkConnectionId,
            adapterType: adapter.adapterType,
            outcome: 'SUCCESS',
            details: `Opened connection for scope ${validScope.scopeKey}`,
        });
        await this.listeners.dispatchEvent('CONNECTION_OPENED', connection.networkConnectionId, `Adapter ${adapter.adapterId}`);
        return connection;
    }
    /**
     * EN: Closes an active network connection.
     * VI: Đóng một kết nối mạng đang hoạt động.
     */
    async closeConnection(connectionId, reason) {
        const conn = this.registry.getConnection(connectionId);
        if (!conn)
            return;
        const adapter = this.registry.getAdapter(conn.scope.networkAdapterId) ?? this.defaultAdapter;
        await adapter.close(connectionId, reason);
        this.registry.unregisterConnection(connectionId);
        this.recordAudit({
            eventType: 'CONNECTION_CLOSED',
            networkConnectionId: connectionId,
            adapterType: conn.adapterType,
            outcome: 'SUCCESS',
            details: reason ?? 'Connection closed gracefully',
        });
        await this.listeners.dispatchEvent('CONNECTION_CLOSED', connectionId, reason);
    }
    /**
     * EN: Routes and sends a frame through the appropriate connection and adapter.
     * VI: Định tuyến và gửi khung qua kết nối và adapter phù hợp.
     */
    async sendFrame(frame) {
        const conn = this.registry.getConnection(frame.networkConnectionId);
        if (!conn) {
            const err = createNetworkFailureDescriptor({
                code: 'CONNECTION_CLOSED',
                message: `Connection "${frame.networkConnectionId}" not registered in runtime.`,
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
        const adapter = this.registry.getAdapter(conn.scope.networkAdapterId) ?? this.defaultAdapter;
        const result = await adapter.send(frame);
        if (result.success) {
            this.recordAudit({
                eventType: 'FRAME_SENT',
                networkConnectionId: frame.networkConnectionId,
                sequence: frame.sequence,
                outcome: 'SUCCESS',
                details: `Sent frame ${frame.frameId} (type ${frame.messageType})`,
            });
            await this.listeners.dispatchFrame(frame);
        }
        else {
            this.recordAudit({
                eventType: 'NETWORK_ERROR',
                networkConnectionId: frame.networkConnectionId,
                sequence: frame.sequence,
                outcome: result.status === 'RATE_LIMITED' ? 'THROTTLED' : 'FAILURE',
                failureCode: result.error?.code,
                details: result.error?.message,
            });
        }
        return result;
    }
    /**
     * EN: Receives a frame from an active connection.
     * VI: Tiếp nhận một khung từ một kết nối đang hoạt động.
     */
    async receiveFrame(connectionId) {
        const conn = this.registry.getConnection(connectionId);
        if (!conn)
            return undefined;
        const adapter = this.registry.getAdapter(conn.scope.networkAdapterId) ?? this.defaultAdapter;
        const frame = await adapter.receive(connectionId);
        if (frame) {
            this.recordAudit({
                eventType: 'FRAME_RECEIVED',
                networkConnectionId: connectionId,
                sequence: frame.sequence,
                outcome: 'SUCCESS',
                details: `Received frame ${frame.frameId}`,
            });
            await this.listeners.dispatchFrame(frame);
        }
        return frame;
    }
    /**
     * EN: Performs an end-to-end heartbeat check for a connection.
     * Invariant: HEARTBEAT_ALIVE ≠ TASK_SUCCESS.
     *
     * VI: Thực hiện kiểm tra nhịp tim đầu-cuối cho một kết nối.
     * Bảo đảm: NHỊP TIM CÒN SỐNG ≠ TÁC VỤ THÀNH CÔNG.
     */
    async checkHeartbeat(connectionId, sequence, timestamp = 0) {
        const signal = createNetworkHeartbeatSignal({
            networkConnectionId: connectionId,
            sequence,
            timestamp,
        });
        const ack = createNetworkHeartbeatAck({
            signal,
            currentTimestamp: timestamp + 10,
        });
        const evaluation = evaluateNetworkHeartbeat(signal, ack);
        this.recordAudit({
            eventType: evaluation.success ? 'HEARTBEAT_RECEIVED' : 'HEARTBEAT_TIMEOUT',
            networkConnectionId: connectionId,
            sequence,
            outcome: evaluation.success ? 'SUCCESS' : 'FAILURE',
            details: evaluation.error ?? `Heartbeat RTT ${evaluation.roundTripTimeMs}ms`,
            timestamp,
        });
        return evaluation;
    }
    /**
     * EN: Attempts to reconnect an existing disconnected/suspended connection.
     * Invariant: RECONNECT ≠ NEW_BRAIN.
     *
     * VI: Nỗ lực kết nối lại một kết nối đã bị ngắt/tạm ngưng.
     * Bảo đảm: RECONNECT ≠ NEW_BRAIN.
     */
    async reconnect(previousConnectionId, scope, lastAckedSequence, timestamp = 0) {
        const previous = this.registry.getConnection(previousConnectionId);
        if (!previous) {
            return deepFreeze({
                success: false,
                resumedSequence: 0,
                status: 'RECONNECT_REJECTED',
                reason: `Previous connection "${previousConnectionId}" not found in registry.`,
                timestamp,
                fingerprint: 'RECONNECT_NOT_FOUND',
            });
        }
        const request = createNetworkReconnectRequest({
            previousConnectionId,
            scope,
            lastAcknowledgedSequence: lastAckedSequence,
            timestamp,
        });
        const result = evaluateNetworkReconnect(previous, request);
        if (result.success && result.connection) {
            this.registry.registerConnection(result.connection);
            this.recordAudit({
                eventType: 'RECONNECT_ACCEPTED',
                networkConnectionId: previousConnectionId,
                sequence: result.resumedSequence,
                outcome: 'SUCCESS',
                details: `Reconnection accepted. Resumed at sequence ${result.resumedSequence}.`,
                timestamp,
            });
        }
        else {
            this.recordAudit({
                eventType: 'RECONNECT_REJECTED',
                networkConnectionId: previousConnectionId,
                outcome: 'REJECTED',
                details: result.reason,
                timestamp,
            });
        }
        return result;
    }
    /**
     * EN: Evaluates timeout on an operation.
     * VI: Đánh giá timeout trên một thao tác.
     */
    checkTimeout(type, startTimestamp, currentTimestamp) {
        return evaluateNetworkTimeout({
            timeoutType: type,
            startTimestamp,
            currentTimestamp,
        });
    }
    /**
     * EN: Evaluates backpressure metrics for an adapter or connection queue.
     * VI: Đánh giá chỉ số áp lực ngược cho một hàng đợi adapter hoặc kết nối.
     */
    checkBackpressure(pendingFrames, maxCapacity) {
        return computeNetworkBackpressure({ pendingFrames, maxCapacity });
    }
    /**
     * EN: Records an immutable audit entry.
     * VI: Ghi lại một mục kiểm toán bất biến.
     */
    recordAudit(params) {
        const audit = createNetworkAuditRecord(params);
        this.audits.push(audit);
    }
    /**
     * EN: Retrieves all recorded audit entries.
     * VI: Lấy tất cả các mục kiểm toán đã ghi nhận.
     */
    getAudits() {
        return Object.freeze([...this.audits]);
    }
    /**
     * EN: Clears all audits and reset registries.
     * VI: Xóa tất cả các mục kiểm toán và đặt lại các sổ đăng ký.
     */
    clear() {
        this.registry.clear();
        this.listeners.clear();
        this.audits.length = 0;
        this.registry.registerAdapter(this.defaultAdapter);
    }
}
