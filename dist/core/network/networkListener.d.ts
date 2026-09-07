import type { NetworkFrame, NetworkEventType } from './networkTypes.js';
export type NetworkFrameHandler = (frame: Readonly<NetworkFrame>) => Promise<void> | void;
export type NetworkEventHandler = (eventType: NetworkEventType, connectionId: string, details?: string) => Promise<void> | void;
export declare class NetworkListenerRegistry {
    private readonly frameHandlers;
    private readonly eventHandlers;
    private readonly globalFrameHandlers;
    /**
     * EN: Registers a handler for frames on a specific network connection.
     * VI: Đăng ký một trình xử lý cho các khung trên một kết nối mạng cụ thể.
     */
    onFrame(connectionId: string, handler: NetworkFrameHandler): () => void;
    /**
     * EN: Registers a global frame handler for all incoming frames.
     * VI: Đăng ký một trình xử lý toàn cục cho tất cả các khung mạng đến.
     */
    onGlobalFrame(handler: NetworkFrameHandler): () => void;
    /**
     * EN: Registers a handler for a specific network event type.
     * VI: Đăng ký một trình xử lý cho một loại sự kiện mạng cụ thể.
     */
    onEvent(eventType: NetworkEventType, handler: NetworkEventHandler): () => void;
    /**
     * EN: Dispatches an incoming frame to registered handlers.
     * VI: Phân phối một khung đến cho các trình xử lý đã đăng ký.
     */
    dispatchFrame(frame: Readonly<NetworkFrame>): Promise<void>;
    /**
     * EN: Dispatches a network event to registered handlers.
     * VI: Phân phối một sự kiện mạng cho các trình xử lý đã đăng ký.
     */
    dispatchEvent(eventType: NetworkEventType, connectionId: string, details?: string): Promise<void>;
    /**
     * EN: Clears all registered handlers.
     * VI: Xóa tất cả các trình xử lý đã đăng ký.
     */
    clear(): void;
}
