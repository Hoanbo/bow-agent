import type { CapabilityAdvertisement, BodyCommand, BodyCommandResult, BodyRecord, BodyConnectionSender } from './types.js';
export interface BodyRegistryOptions {
    /** Heartbeat timeout in milliseconds (default: 15000ms) */
    heartbeatTimeoutMs?: number;
    /** Background sweep interval in milliseconds (default: 5000ms) */
    sweepIntervalMs?: number;
}
export declare class BodyRegistry {
    private readonly bodies;
    /**
     * Lưu trữ tập trung tất cả lệnh đang chờ phản hồi từ Body.
     * Key = commandId, Value = { bodyId, resolve, reject, timeoutHandle }
     * Được quản lý tại đây để failPendingCommandsForBody() hoạt động từ mọi nguyên
     * nhân disconnect (ws.close, heartbeat timeout, manual unregister).
     */
    private readonly pendingCommands;
    private readonly heartbeatTimeoutMs;
    private readonly sweepIntervalMs;
    private sweepTimer?;
    private onBodyUnregisteredListeners;
    constructor(options?: BodyRegistryOptions);
    /**
     * Đăng ký hoặc cập nhật một Body ngoại vi cùng danh sách Capability quảng bá.
     */
    registerBody(ad: CapabilityAdvertisement, connection?: BodyConnectionSender): BodyRecord;
    /**
     * Gỡ đăng ký một Body khỏi hệ thống.
     */
    unregisterBody(bodyId: string, reason?: string): boolean;
    /**
     * EN: Register a pending command waiting for a response from a Body.
     * VI: Đăng ký một lệnh đang chờ phản hồi từ Body vào registry trung tâm.
     *
     * @param commandId - Unique command identifier.
     * @param bodyId    - Target body that will execute this command.
     * @param resolve   - Resolve callback for the pending Promise.
     * @param reject    - Reject callback for the pending Promise.
     * @param timeoutHandle - Active setTimeout handle (will be cleared on early fail).
     */
    registerPendingCommand(commandId: string, bodyId: string, resolve: (res: BodyCommandResult) => void, reject: (err: Error) => void, timeoutHandle: NodeJS.Timeout): void;
    /**
     * EN: Resolve a pending command when the Body returns its result.
     * VI: Giải quyết một lệnh đang chờ khi Body trả kết quả về.
     *
     * @returns true nếu command tồn tại và đã được resolved, false nếu không tìm thấy.
     */
    resolvePendingCommand(commandId: string, result: BodyCommandResult): boolean;
    /**
     * EN: Explicitly abort/cancel a single pending command by commandId.
     * Clears active timer and rejects the pending promise immediately.
     *
     * VI: Hủy một lệnh đang chờ theo commandId cụ thể.
     * Xóa timer đang chạy và reject promise ngay lập tức.
     */
    abortCommand(commandId: string, reason?: string): boolean;
    /**
     * EN: Immediately reject all pending commands belonging to a given body.
     * Called automatically by unregisterBody() — covers ws.close, heartbeat timeout,
     * and manual unregister in one place. Safe to call multiple times (idempotent).
     *
     * VI: Từ chối ngay lập tức tất cả lệnh đang chờ thuộc về một body cụ thể.
     * Được gọi tự động bởi unregisterBody() — bao phủ ws.close, heartbeat timeout,
     * và unregister thủ công tại một điểm duy nhất. An toàn khi gọi nhiều lần.
     *
     * @param bodyId - Body bị ngắt kết nối.
     * @param reason - Mã lỗi rõ ràng ghi vào reject message.
     */
    failPendingCommandsForBody(bodyId: string, reason: string): void;
    /**
     * Cập nhật thời điểm nhận heartbeat gần nhất từ Body.
     */
    recordHeartbeat(bodyId: string): boolean;
    /**
     * Tra cứu thông tin một Body theo bodyId (loại trừ nếu đã quá hạn heartbeat).
     */
    getBody(bodyId: string): BodyRecord | undefined;
    /**
     * Tìm tất cả các Body còn sống có khả năng thực thi capabilityName.
     */
    findBodiesWithCapability(capabilityName: string): BodyRecord[];
    /**
     * Lấy danh sách toàn bộ các Body còn hoạt động.
     */
    getAllActiveBodies(): BodyRecord[];
    /**
     * Điều phối thực thi lệnh BodyCommand tới Body sở hữu capability.
     */
    executeBodyCommand(command: BodyCommand): Promise<BodyCommandResult>;
    /**
     * Đăng ký lắng nghe sự kiện gỡ đăng ký body (hữu ích cho logging & telemetry).
     */
    onBodyUnregistered(listener: (bodyId: string, reason: string) => void): void;
    /**
     * Bắt đầu vòng quét dọn dẹp các body quá hạn heartbeat.
     */
    private startSweep;
    /**
     * Dừng timer dọn dẹp (dùng khi shutdown hoặc teardown kiểm thử).
     */
    stop(): void;
    private isExpired;
}
/**
 * Singleton instance của BodyRegistry cho Core.
 */
export declare const globalBodyRegistry: BodyRegistry;
