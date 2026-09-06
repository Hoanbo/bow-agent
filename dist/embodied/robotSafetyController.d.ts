export interface RobotSafetyStatus {
    eStopEngaged: boolean;
    heartbeatHealthy: boolean;
    batteryTempSafe: boolean;
    batteryLevel: number;
    batteryTempC: number;
    lastHeartbeatMs: number;
    panAngle: number;
    tiltAngle: number;
    actuatorEnabled: boolean;
    safetyViolation?: string;
}
export declare class RobotSafetyController {
    private eStopEngaged;
    private lastHeartbeatTime;
    private batteryLevel;
    private batteryTempC;
    private currentPan;
    private currentTilt;
    private actuatorPower;
    private readonly MAX_PAN;
    private readonly MIN_PAN;
    private readonly MAX_TILT;
    private readonly MIN_TILT;
    private readonly MAX_SAFE_TEMP_C;
    private readonly HEARTBEAT_TIMEOUT_MS;
    /**
     * Kích hoạt Dừng Khẩn Cấp (E-Stop) lập tức ngắt toàn bộ cơ cấu chấp hành
     */
    triggerEmergencyStop(reason?: string): RobotSafetyStatus;
    /**
     * Khôi phục E-Stop sau khi đã kiểm tra an toàn thủ công
     */
    resetEmergencyStop(): RobotSafetyStatus;
    /**
     * Cập nhật nhịp tim từ ESP32 firmware
     */
    recordFirmwareHeartbeat(metrics?: {
        batteryLevel?: number;
        batteryTempC?: number;
    }): void;
    /**
     * Thẩm định và kẹp biên (clamp) góc quay servo an toàn
     */
    validateAndClampMotion(requestedPan: number, requestedTilt: number): {
        allowed: boolean;
        safePan: number;
        safeTilt: number;
        reason?: string;
    };
    getStatus(violationOverride?: string): RobotSafetyStatus;
}
export declare const globalRobotSafety: RobotSafetyController;
