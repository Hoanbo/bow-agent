import { type ObservabilitySessionId, type TelemetrySample, type MetricObservation } from './observabilityTypes.js';
export interface RawTelemetryInput {
    readonly targetId: string;
    readonly sourceId: string;
    readonly timestamp?: number;
    readonly availability?: number;
    readonly errorRate?: number;
    readonly latencyP95Ms?: number;
    readonly latencyP99Ms?: number;
    readonly healthProbesPassing?: number;
    readonly totalHealthProbes?: number;
    readonly deploymentVersion?: string;
    readonly configurationFingerprint?: string;
    readonly manifestFingerprint?: string;
    readonly runtimeStatus?: string;
    readonly sampleCount?: number;
    readonly customMetrics?: Record<string, number | string | boolean>;
}
export declare class TelemetryObservationEngine {
    private samples;
    /**
     * Sanitizes confidential values from records to prevent secret leakage into evidence.
     * Làm sạch các giá trị bảo mật khỏi bản ghi để ngăn rò rỉ bí mật vào bằng chứng.
     */
    sanitizeSecrets<T>(data: T): T;
    /**
     * Normalizes raw metrics into a strictly bounded, deterministic MetricObservation.
     * Chuẩn hóa các chỉ số thô thành một MetricObservation xác định, có giới hạn nghiêm ngặt.
     */
    normalizeMetrics(raw: RawTelemetryInput): MetricObservation;
    /**
     * Computes a deterministic SHA-256 evidence hash for a telemetry sample.
     * Tính toán mã băm bằng chứng SHA-256 xác định cho mẫu đo từ xa.
     */
    computeEvidenceHash(targetId: string, sourceId: string, timestamp: number, metrics: MetricObservation): string;
    /**
     * Ingests and registers an immutable telemetry sample for an observability session.
     * Thu nạp và ghi nhận một mẫu đo từ xa bất biến cho phiên quan sát.
     */
    ingestSample(sessionId: ObservabilitySessionId, raw: RawTelemetryInput): TelemetrySample;
    /**
     * Retrieves all ingested samples for a given session.
     * Lấy tất cả các mẫu đã thu nạp cho một phiên đã cho.
     */
    getSamples(sessionId: ObservabilitySessionId): readonly TelemetrySample[];
    /**
     * Clears in-memory samples for session teardown or test resets.
     * Xóa các mẫu trong bộ nhớ để dọn dẹp phiên hoặc đặt lại kiểm thử.
     */
    clear(sessionId?: ObservabilitySessionId): void;
}
