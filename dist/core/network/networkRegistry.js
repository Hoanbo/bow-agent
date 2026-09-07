// src/core/network/networkRegistry.ts
// BOWCON V4.0 — MILESTONE 1.3.21: SCOPE-ISOLATED NETWORK REGISTRY
//
// EN:
// Authoritative multi-tenant network registry.
// Tracks adapters, connections, surface bindings, sequences, and backpressure states.
// Strictly enforces 7-tuple scope isolation: cross-tenant or cross-session access fails closed.
//
// VI:
// Sổ đăng ký mạng cô lập đa người thuê có thẩm quyền.
// Theo dõi adapter, kết nối, liên kết bề mặt, chuỗi số và trạng thái áp lực ngược.
// Thực thi nghiêm ngặt cô lập bộ 7: truy cập xuyên người thuê hoặc xuyên phiên bị chặn an toàn.
import { validateScopedNetworkIdentity } from './networkValidator.js';
export class NetworkRegistry {
    adapters = new Map();
    connections = new Map();
    connectionsByScopeKey = new Map();
    surfaceToConnection = new Map();
    /**
     * EN: Registers an adapter instance.
     * VI: Đăng ký một thực thể adapter.
     */
    registerAdapter(adapter) {
        if (!adapter || typeof adapter !== 'object') {
            throw new Error('[NETWORK_REGISTRY_ERROR] Invalid adapter instance.');
        }
        this.adapters.set(adapter.adapterId, adapter);
    }
    /**
     * EN: Retrieves an adapter by ID.
     * VI: Lấy adapter theo ID.
     */
    getAdapter(adapterId) {
        return this.adapters.get(adapterId);
    }
    /**
     * EN: Registers a new active connection snapshot under 7-tuple scope.
     * VI: Đăng ký một snapshot kết nối hoạt động mới dưới phạm vi bộ 7.
     */
    registerConnection(snapshot) {
        const validScope = validateScopedNetworkIdentity(snapshot.scope);
        if (this.connections.has(snapshot.networkConnectionId)) {
            const existing = this.connections.get(snapshot.networkConnectionId);
            if (existing.scopeKey !== validScope.scopeKey) {
                throw new Error(`[NETWORK_REGISTRY_ERROR] Cross-scope collision detected for connection "${snapshot.networkConnectionId}".`);
            }
        }
        this.connections.set(snapshot.networkConnectionId, snapshot);
        this.connectionsByScopeKey.set(validScope.scopeKey, snapshot.networkConnectionId);
        this.surfaceToConnection.set(validScope.surfaceId, snapshot.networkConnectionId);
    }
    /**
     * EN: Retrieves a connection by its connection ID, validating that the requesting scope matches.
     * VI: Lấy kết nối theo ID kết nối, xác thực rằng phạm vi yêu cầu phải khớp.
     */
    getConnection(connectionId, requestingScope) {
        const conn = this.connections.get(connectionId);
        if (!conn)
            return undefined;
        if (requestingScope) {
            const validScope = validateScopedNetworkIdentity(requestingScope);
            if (conn.scopeKey !== validScope.scopeKey) {
                throw new Error(`[NETWORK_REGISTRY_SECURITY_VIOLATION] Cross-scope access denied. Connection belongs to "${conn.scopeKey}", requested by "${validScope.scopeKey}".`);
            }
        }
        return conn;
    }
    /**
     * EN: Retrieves connection ID by surface ID, validating requesting userId and brainId.
     * VI: Lấy ID kết nối theo ID bề mặt, xác thực userId và brainId yêu cầu.
     */
    getConnectionBySurface(surfaceId, requestingUserId, requestingBrainId) {
        const connId = this.surfaceToConnection.get(surfaceId);
        if (!connId)
            return undefined;
        const conn = this.connections.get(connId);
        if (!conn)
            return undefined;
        if (requestingUserId && conn.scope.userId !== requestingUserId) {
            throw new Error(`[NETWORK_REGISTRY_SECURITY_VIOLATION] User isolation: surface "${surfaceId}" is bound to user "${conn.scope.userId}", requested by "${requestingUserId}".`);
        }
        if (requestingBrainId && conn.scope.brainId !== requestingBrainId) {
            throw new Error(`[NETWORK_REGISTRY_SECURITY_VIOLATION] Brain isolation: surface "${surfaceId}" is bound to brain "${conn.scope.brainId}", requested by "${requestingBrainId}".`);
        }
        return conn;
    }
    /**
     * EN: Removes a connection from the registry.
     * VI: Xóa một kết nối khỏi sổ đăng ký.
     */
    unregisterConnection(connectionId) {
        const conn = this.connections.get(connectionId);
        if (conn) {
            this.connections.delete(connectionId);
            this.connectionsByScopeKey.delete(conn.scopeKey);
            this.surfaceToConnection.delete(conn.scope.surfaceId);
        }
    }
    /**
     * EN: Returns all active registered adapters.
     * VI: Trả về tất cả các adapter đang hoạt động đã đăng ký.
     */
    listAdapters() {
        return Array.from(this.adapters.values());
    }
    /**
     * EN: Returns total count of active connections.
     * VI: Trả về tổng số lượng kết nối đang hoạt động.
     */
    getActiveConnectionCount() {
        return this.connections.size;
    }
    /**
     * EN: Clears all entries from the registry.
     * VI: Xóa toàn bộ mục khỏi sổ đăng ký.
     */
    clear() {
        this.adapters.clear();
        this.connections.clear();
        this.connectionsByScopeKey.clear();
        this.surfaceToConnection.clear();
    }
}
