export declare const BODY_CONFIG: {
    /**
     * Timeout tối đa chờ phản hồi cho một lệnh điều phối xuống Body ngoại vi.
     * Mặc định: 10000ms (10 giây).
     * Ảnh hưởng: Nếu Body không phản hồi trong khoảng này, Promise lệnh sẽ bị reject với COMMAND_TIMEOUT.
     */
    readonly commandTimeoutMs: number;
    /**
     * Thời gian timeout cho Heartbeat từ Body.
     * Mặc định: 15000ms (15 giây).
     * Ảnh hưởng: Nếu quá 15s không nhận được heartbeat, Body sẽ bị coi là mất kết nối và gỡ khỏi registry.
     */
    readonly heartbeatTimeoutMs: number;
    /**
     * Chu kỳ chạy dọn dẹp (sweep) kiểm tra các Body hết hạn heartbeat.
     * Mặc định: 5000ms (5 giây).
     */
    readonly sweepIntervalMs: number;
    /**
     * Chu kỳ Body gửi heartbeat ping lên Brain.
     * Mặc định: 5000ms (5 giây).
     */
    readonly heartbeatIntervalMs: number;
    /**
     * Thời gian chờ người dùng nhấn phím vật lý xác nhận Push-to-Talk (PTT).
     * Mặc định: 5000ms (5 giây).
     * Ảnh hưởng: Hết thời gian này lệnh thu âm tự động bị hủy để bảo vệ quyền riêng tư.
     */
    readonly pttConfirmationTimeoutMs: number;
    /**
     * Ngưỡng phát hiện bất thường PTT (Anomaly Detection Threshold).
     * Mặc định: 3 lần timeout liên tiếp.
     */
    readonly pttAnomalyThreshold: number;
    /**
     * Khoảng thời gian cửa sổ trượt để đếm số lần timeout bất thường (Anomaly Detection Window).
     * Mặc định: 60000ms (60 giây).
     */
    readonly pttAnomalyWindowMs: number;
    /**
     * Cấu hình âm thanh chỉ báo an toàn vật lý (Privacy Beep Tones):
     */
    readonly beep: {
        /** Tiếng Beep bắt đầu thu âm: 1200Hz cao, 1 tiếng 120ms */
        readonly startFreqHz: 1200;
        readonly startDurationMs: 120;
        /** Tiếng Beep kết thúc thu âm: 600Hz trầm, 1 tiếng 150ms */
        readonly stopFreqHz: 600;
        readonly stopDurationMs: 150;
        /** Tiếng Beep cảnh báo timeout PTT: 400Hz trầm, 3 tiếng ngắn 80ms ngắt quãng 40ms */
        readonly timeoutFreqHz: 400;
        readonly timeoutBurstCount: 3;
        readonly timeoutBurstDurationMs: 80;
        readonly timeoutPauseDurationMs: 40;
    };
    /**
     * Đường dẫn file script khay hệ thống chỉ báo quyền riêng tư (Privacy Indicator).
     */
    readonly privacyIndicatorScriptPath: string;
    /**
     * Đường dẫn chứng chỉ CA mặc định.
     */
    readonly defaultCaCertPath: string;
};
