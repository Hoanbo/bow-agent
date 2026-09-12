import { type ObservabilitySessionId, type TelemetrySample, type TelemetryAggregationWindow } from './observabilityTypes.js';
export interface AggregationBaselineOptions {
    readonly baselineErrorRate?: number;
    readonly baselineLatencyP95Ms?: number;
    readonly degradationErrorThreshold?: number;
    readonly degradationLatencyThresholdMs?: number;
}
export declare class TelemetryAggregationEngine {
    private windows;
    /**
     * Aggregates a list of telemetry samples into a deterministic observation window.
     * Tổng hợp danh sách các mẫu đo từ xa thành một cửa sổ quan sát xác định.
     */
    aggregateWindow(sessionId: ObservabilitySessionId, targetId: string, samples: readonly TelemetrySample[], options?: AggregationBaselineOptions): TelemetryAggregationWindow;
    /**
     * Retrieves all aggregated windows for a session.
     * Lấy tất cả các cửa sổ đã tổng hợp cho một phiên.
     */
    getWindows(sessionId: ObservabilitySessionId): readonly TelemetryAggregationWindow[];
    /**
     * Clears in-memory windows.
     * Xóa các cửa sổ trong bộ nhớ.
     */
    clear(sessionId?: ObservabilitySessionId): void;
}
