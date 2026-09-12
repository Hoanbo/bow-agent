// src/core/observability/observabilityAdapters.ts
// BOWCON V4.0 — MS-1.3.53: GOVERNED POST-DEPLOYMENT AUTONOMOUS VERIFICATION,
// DRIFT DETECTION & OBSERVABILITY TELEMETRY MESH
//
// Extensible observational adapter interfaces and mock/in-memory provider implementations.
// Các giao diện bộ điều hợp quan sát mở rộng và các triển khai nhà cung cấp giả lập/trong bộ nhớ.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - ADAPTERS ARE OBSERVATIONAL ONLY (Zero mutation or autonomous execution capability).
// - Zero unrestricted shell primitives or unsafe network sockets.
// - All telemetry returned conforms to normalized schemas.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
/**
 * Local process probe adapter returning in-memory runtime signals.
 * Bộ điều hợp thăm dò quy trình cục bộ trả về các tín hiệu thời gian chạy trong bộ nhớ.
 */
export class LocalProcessProbeAdapter {
    defaultStatus;
    simulatedErrorRate;
    simulatedLatencyMs;
    adapterName = 'LocalProcessProbeAdapter';
    adapterType = 'LOCAL_PROCESS';
    constructor(defaultStatus = 'RUNNING', simulatedErrorRate = 0.0, simulatedLatencyMs = 25) {
        this.defaultStatus = defaultStatus;
        this.simulatedErrorRate = simulatedErrorRate;
        this.simulatedLatencyMs = simulatedLatencyMs;
    }
    async sample(targetId) {
        return {
            targetId,
            sourceId: this.adapterName,
            timestamp: Date.now(),
            availability: 1.0,
            errorRate: this.simulatedErrorRate,
            latencyP95Ms: this.simulatedLatencyMs,
            latencyP99Ms: this.simulatedLatencyMs * 1.5,
            healthProbesPassing: 1,
            totalHealthProbes: 1,
            deploymentVersion: '1.0.0',
            configurationFingerprint: 'cfg-local',
            manifestFingerprint: 'manifest-local',
            runtimeStatus: this.defaultStatus,
            sampleCount: 1,
        };
    }
}
/**
 * Synthetic HTTP probe adapter simulating HTTP health checks without executing unmonitored HTTP requests.
 * Bộ điều hợp thăm dò HTTP tổng hợp mô phỏng kiểm tra sức khỏe HTTP mà không thực thi các yêu cầu HTTP không được giám sát.
 */
export class SyntheticHttpProbeAdapter {
    endpointUrl;
    simulatedStatusCode;
    simulatedResponseTimeMs;
    adapterName = 'SyntheticHttpProbeAdapter';
    adapterType = 'HTTP_PROBE';
    constructor(endpointUrl, simulatedStatusCode = 200, simulatedResponseTimeMs = 30) {
        this.endpointUrl = endpointUrl;
        this.simulatedStatusCode = simulatedStatusCode;
        this.simulatedResponseTimeMs = simulatedResponseTimeMs;
    }
    async sample(targetId) {
        const isSuccess = this.simulatedStatusCode >= 200 && this.simulatedStatusCode < 300;
        return {
            targetId,
            sourceId: `${this.adapterName}:${this.endpointUrl}`,
            timestamp: Date.now(),
            availability: isSuccess ? 1.0 : 0.0,
            errorRate: isSuccess ? 0.0 : 1.0,
            latencyP95Ms: this.simulatedResponseTimeMs,
            latencyP99Ms: this.simulatedResponseTimeMs * 1.2,
            healthProbesPassing: isSuccess ? 1 : 0,
            totalHealthProbes: 1,
            deploymentVersion: '1.0.0',
            configurationFingerprint: 'cfg-http',
            manifestFingerprint: 'manifest-http',
            runtimeStatus: isSuccess ? 'UP' : 'DOWN',
            sampleCount: 1,
            customMetrics: {
                statusCode: this.simulatedStatusCode,
                endpointUrl: this.endpointUrl,
            },
        };
    }
}
/**
 * Filesystem observer adapter capturing observed manifest snapshots.
 * Bộ điều hợp quan sát hệ thống tệp chụp ảnh nhanh tệp kê khai quan sát được.
 */
export class FilesystemObserverAdapter {
    manifestSupplier;
    adapterName = 'FilesystemObserverAdapter';
    adapterType = 'FILESYSTEM';
    constructor(manifestSupplier) {
        this.manifestSupplier = manifestSupplier;
    }
    async sample(targetId) {
        const manifest = this.manifestSupplier();
        return {
            targetId,
            sourceId: this.adapterName,
            timestamp: Date.now(),
            availability: 1.0,
            errorRate: 0.0,
            latencyP95Ms: 5,
            latencyP99Ms: 10,
            healthProbesPassing: 1,
            totalHealthProbes: 1,
            deploymentVersion: '1.0.0',
            configurationFingerprint: 'cfg-fs',
            manifestFingerprint: `fs-${manifest.length}-entries`,
            runtimeStatus: 'VERIFIED',
            sampleCount: manifest.length,
        };
    }
}
