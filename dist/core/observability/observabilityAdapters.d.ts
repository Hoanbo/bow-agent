import { type RawTelemetryInput } from './telemetryObservationEngine.js';
import { type FilesystemManifestEntry } from './driftDetectionEngine.js';
/**
 * Universal interface for all post-deployment observational adapters.
 * Giao diện phổ quát cho tất cả các bộ điều hợp quan sát sau triển khai.
 */
export interface IObservabilityAdapter {
    readonly adapterName: string;
    readonly adapterType: 'LOCAL_PROCESS' | 'HTTP_PROBE' | 'FILESYSTEM' | 'CONFIGURATION' | 'DEPLOYMENT' | 'PROMETHEUS' | 'CLOUDWATCH' | 'VERCEL' | 'SUPABASE' | 'INFRASTRUCTURE';
    /**
     * Samples observational telemetry safely without performing any state mutations.
     * Lấy mẫu đo từ xa quan sát một cách an toàn mà không thực hiện bất kỳ sửa đổi trạng thái nào.
     */
    sample(targetId: string): Promise<RawTelemetryInput>;
}
/**
 * Local process probe adapter returning in-memory runtime signals.
 * Bộ điều hợp thăm dò quy trình cục bộ trả về các tín hiệu thời gian chạy trong bộ nhớ.
 */
export declare class LocalProcessProbeAdapter implements IObservabilityAdapter {
    private readonly defaultStatus;
    private readonly simulatedErrorRate;
    private readonly simulatedLatencyMs;
    readonly adapterName = "LocalProcessProbeAdapter";
    readonly adapterType = "LOCAL_PROCESS";
    constructor(defaultStatus?: string, simulatedErrorRate?: number, simulatedLatencyMs?: number);
    sample(targetId: string): Promise<RawTelemetryInput>;
}
/**
 * Synthetic HTTP probe adapter simulating HTTP health checks without executing unmonitored HTTP requests.
 * Bộ điều hợp thăm dò HTTP tổng hợp mô phỏng kiểm tra sức khỏe HTTP mà không thực thi các yêu cầu HTTP không được giám sát.
 */
export declare class SyntheticHttpProbeAdapter implements IObservabilityAdapter {
    private readonly endpointUrl;
    private readonly simulatedStatusCode;
    private readonly simulatedResponseTimeMs;
    readonly adapterName = "SyntheticHttpProbeAdapter";
    readonly adapterType = "HTTP_PROBE";
    constructor(endpointUrl: string, simulatedStatusCode?: number, simulatedResponseTimeMs?: number);
    sample(targetId: string): Promise<RawTelemetryInput>;
}
/**
 * Filesystem observer adapter capturing observed manifest snapshots.
 * Bộ điều hợp quan sát hệ thống tệp chụp ảnh nhanh tệp kê khai quan sát được.
 */
export declare class FilesystemObserverAdapter implements IObservabilityAdapter {
    private readonly manifestSupplier;
    readonly adapterName = "FilesystemObserverAdapter";
    readonly adapterType = "FILESYSTEM";
    constructor(manifestSupplier: () => readonly FilesystemManifestEntry[]);
    sample(targetId: string): Promise<RawTelemetryInput>;
}
