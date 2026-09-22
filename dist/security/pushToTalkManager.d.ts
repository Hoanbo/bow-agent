export interface PendingPttRequest {
    commandId: string;
    createdAt: number;
    timeoutMs: number;
    resolve: (confirmed: boolean) => void;
    reject: (err: Error) => void;
    timer: NodeJS.Timeout;
}
export type PttTimeoutBeepNotifier = (type: 'timeout') => Promise<void> | void;
export declare function isPushToTalkEnabled(): boolean;
export declare class PushToTalkManager {
    private pendingRequests;
    private defaultTimeoutMs;
    private hotkey;
    /**
     * EN: Notifier callback or delegate to emit timeout alert beeps.
     * VI: Delegate/Callback phát âm báo cảnh báo timeout.
     */
    private beepNotifier?;
    /**
     * EN: Hook invoked whenever timeout beep is emitted (useful for tests and auditing).
     * VI: Hook sự kiện được gọi mỗi khi phát tiếng beep cảnh báo timeout.
     */
    onBeep?: (type: 'timeout') => void;
    /**
     * EN: Hook invoked whenever anomalous repeated timeouts (3+ in 60s) are detected.
     * VI: Hook sự kiện được gọi khi phát hiện bất thường (>= 3 lần timeout trong 60s).
     */
    onAnomalyDetected?: (count: number) => void;
    private recentTimeoutTimestamps;
    private readonly anomalyThresholdCount;
    private readonly anomalyWindowMs;
    constructor();
    setBeepNotifier(notifier: PttTimeoutBeepNotifier): void;
    getRecentTimeoutCount(): number;
    clearRecentTimeouts(): void;
    private recordTimeoutOccurrence;
    private emitTimeoutAlertSound;
    isEnabled(): boolean;
    getHotkey(): string;
    /**
     * Đợi xác nhận vật lý (Push-to-Talk) từ người dùng cục bộ tại Machine B.
     */
    waitForConfirmation(commandId: string, customTimeoutMs?: number): Promise<boolean>;
    /**
     * EN: Simulates physical key press. STRICTLY RESTRICTED TO TEST ENVIRONMENT (NODE_ENV=test).
     * VI: Giả lập việc bấm phím vật lý xác nhận PTT. BẮT BUỘC CHỈ ĐƯỢC GỌI TRONG MÔI TRƯỜNG TEST (NODE_ENV=test).
     *
     * @throws Error with code TEST_ONLY_METHOD_CALLED_OUTSIDE_TEST_ENV if NODE_ENV !== 'test'
     */
    __testOnly_simulatePhysicalPress(commandId?: string): boolean;
    /**
     * @deprecated REMOVED FOR SECURITY. Do not call in production or test.
     */
    simulatePhysicalPress(commandId?: string): boolean;
    /**
     * Hủy bỏ toàn bộ request đang chờ
     */
    cancelAll(): void;
    getPendingCount(): number;
}
export declare const globalPushToTalkManager: PushToTalkManager;
/**
 * EN: Dedicated test-only controller for Push-to-Talk simulation.
 * VI: Bộ điều khiển chuyên dụng CHỈ DÙNG CHO TEST để mô phỏng xác nhận Push-to-Talk.
 *
 * LƯU Ý BẢO MẬT:
 * 1. Tuyệt đối không được import hay sử dụng trong bất kỳ file production/runtime nào.
 * 2. Bắt buộc có guard NODE_ENV === 'test'.
 */
export declare class TestOnlyPushToTalkController {
    private manager;
    constructor(manager?: PushToTalkManager);
    simulatePhysicalPress(commandId?: string): boolean;
}
