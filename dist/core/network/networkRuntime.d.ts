import type { ScopedNetworkIdentity, NetworkFrame, NetworkOperationResult, NetworkAuditRecord } from './networkTypes.js';
import type { NetworkAdapter } from './networkAdapter.js';
import type { NetworkConnectionSnapshot } from './networkConnection.js';
import { NetworkRegistry } from './networkRegistry.js';
import { NetworkListenerRegistry } from './networkListener.js';
import { type HeartbeatEvaluationResult } from './networkHeartbeat.js';
import { type NetworkReconnectResult } from './networkReconnect.js';
import { type NetworkTimeoutType, type TimeoutEvaluationResult } from './networkTimeout.js';
export interface NetworkRuntimeOptions {
    readonly defaultAdapter?: NetworkAdapter;
}
export declare class NetworkRuntime {
    private readonly registry;
    private readonly listeners;
    private readonly audits;
    private readonly defaultAdapter;
    constructor(options?: NetworkRuntimeOptions);
    getRegistry(): NetworkRegistry;
    getListeners(): NetworkListenerRegistry;
    getDefaultAdapter(): NetworkAdapter;
    /**
     * EN: Opens a network connection using the specified or default adapter.
     * VI: Mở một kết nối mạng sử dụng adapter chỉ định hoặc mặc định.
     */
    openConnection(scope: ScopedNetworkIdentity, adapterId?: string): Promise<Readonly<NetworkConnectionSnapshot>>;
    /**
     * EN: Closes an active network connection.
     * VI: Đóng một kết nối mạng đang hoạt động.
     */
    closeConnection(connectionId: string, reason?: string): Promise<void>;
    /**
     * EN: Routes and sends a frame through the appropriate connection and adapter.
     * VI: Định tuyến và gửi khung qua kết nối và adapter phù hợp.
     */
    sendFrame(frame: Readonly<NetworkFrame>): Promise<Readonly<NetworkOperationResult>>;
    /**
     * EN: Receives a frame from an active connection.
     * VI: Tiếp nhận một khung từ một kết nối đang hoạt động.
     */
    receiveFrame(connectionId: string): Promise<Readonly<NetworkFrame> | undefined>;
    /**
     * EN: Performs an end-to-end heartbeat check for a connection.
     * Invariant: HEARTBEAT_ALIVE ≠ TASK_SUCCESS.
     *
     * VI: Thực hiện kiểm tra nhịp tim đầu-cuối cho một kết nối.
     * Bảo đảm: NHỊP TIM CÒN SỐNG ≠ TÁC VỤ THÀNH CÔNG.
     */
    checkHeartbeat(connectionId: string, sequence: number, timestamp?: number): Promise<Readonly<HeartbeatEvaluationResult>>;
    /**
     * EN: Attempts to reconnect an existing disconnected/suspended connection.
     * Invariant: RECONNECT ≠ NEW_BRAIN.
     *
     * VI: Nỗ lực kết nối lại một kết nối đã bị ngắt/tạm ngưng.
     * Bảo đảm: RECONNECT ≠ NEW_BRAIN.
     */
    reconnect(previousConnectionId: string, scope: ScopedNetworkIdentity, lastAckedSequence: number, timestamp?: number): Promise<Readonly<NetworkReconnectResult>>;
    /**
     * EN: Evaluates timeout on an operation.
     * VI: Đánh giá timeout trên một thao tác.
     */
    checkTimeout(type: NetworkTimeoutType, startTimestamp: number, currentTimestamp: number): Readonly<TimeoutEvaluationResult>;
    /**
     * EN: Evaluates backpressure metrics for an adapter or connection queue.
     * VI: Đánh giá chỉ số áp lực ngược cho một hàng đợi adapter hoặc kết nối.
     */
    checkBackpressure(pendingFrames: number, maxCapacity?: number): Readonly<import("./networkTypes.js").NetworkBackpressureMetrics>;
    /**
     * EN: Records an immutable audit entry.
     * VI: Ghi lại một mục kiểm toán bất biến.
     */
    private recordAudit;
    /**
     * EN: Retrieves all recorded audit entries.
     * VI: Lấy tất cả các mục kiểm toán đã ghi nhận.
     */
    getAudits(): readonly Readonly<NetworkAuditRecord>[];
    /**
     * EN: Clears all audits and reset registries.
     * VI: Xóa tất cả các mục kiểm toán và đặt lại các sổ đăng ký.
     */
    clear(): void;
}
