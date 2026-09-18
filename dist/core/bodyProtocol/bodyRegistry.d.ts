import type { CapabilityAdvertisement, BodyCommand, BodyCommandResult, BodyRecord, BodyConnectionSender } from './types.js';
export interface BodyRegistryOptions {
    /** Heartbeat timeout in milliseconds (default: 15000ms) */
    heartbeatTimeoutMs?: number;
    /** Background sweep interval in milliseconds (default: 5000ms) */
    sweepIntervalMs?: number;
}
export declare class BodyRegistry {
    private readonly bodies;
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
