// src/core/network/networkListener.ts
// BOWCON V4.0 — MILESTONE 1.3.21: NETWORK EVENT & FRAME LISTENER REGISTRY
//
// EN:
// Authoritative in-memory event and frame listener registry.
// Manages callbacks for network connection events and frame arrivals without OS sockets.
//
// VI:
// Cơ chế đăng ký listener sự kiện và khung mạng trong bộ nhớ có thẩm quyền.
// Quản lý callback cho các sự kiện kết nối mạng và khung mạng đến mà không dùng socket hệ điều hành.
export class NetworkListenerRegistry {
    frameHandlers = new Map();
    eventHandlers = new Map();
    globalFrameHandlers = new Set();
    /**
     * EN: Registers a handler for frames on a specific network connection.
     * VI: Đăng ký một trình xử lý cho các khung trên một kết nối mạng cụ thể.
     */
    onFrame(connectionId, handler) {
        if (!this.frameHandlers.has(connectionId)) {
            this.frameHandlers.set(connectionId, new Set());
        }
        const set = this.frameHandlers.get(connectionId);
        set.add(handler);
        return () => set.delete(handler);
    }
    /**
     * EN: Registers a global frame handler for all incoming frames.
     * VI: Đăng ký một trình xử lý toàn cục cho tất cả các khung mạng đến.
     */
    onGlobalFrame(handler) {
        this.globalFrameHandlers.add(handler);
        return () => this.globalFrameHandlers.delete(handler);
    }
    /**
     * EN: Registers a handler for a specific network event type.
     * VI: Đăng ký một trình xử lý cho một loại sự kiện mạng cụ thể.
     */
    onEvent(eventType, handler) {
        if (!this.eventHandlers.has(eventType)) {
            this.eventHandlers.set(eventType, new Set());
        }
        const set = this.eventHandlers.get(eventType);
        set.add(handler);
        return () => set.delete(handler);
    }
    /**
     * EN: Dispatches an incoming frame to registered handlers.
     * VI: Phân phối một khung đến cho các trình xử lý đã đăng ký.
     */
    async dispatchFrame(frame) {
        for (const handler of this.globalFrameHandlers) {
            await handler(frame);
        }
        const connectionHandlers = this.frameHandlers.get(frame.networkConnectionId);
        if (connectionHandlers) {
            for (const handler of connectionHandlers) {
                await handler(frame);
            }
        }
    }
    /**
     * EN: Dispatches a network event to registered handlers.
     * VI: Phân phối một sự kiện mạng cho các trình xử lý đã đăng ký.
     */
    async dispatchEvent(eventType, connectionId, details) {
        const handlers = this.eventHandlers.get(eventType);
        if (handlers) {
            for (const handler of handlers) {
                await handler(eventType, connectionId, details);
            }
        }
    }
    /**
     * EN: Clears all registered handlers.
     * VI: Xóa tất cả các trình xử lý đã đăng ký.
     */
    clear() {
        this.frameHandlers.clear();
        this.eventHandlers.clear();
        this.globalFrameHandlers.clear();
    }
}
