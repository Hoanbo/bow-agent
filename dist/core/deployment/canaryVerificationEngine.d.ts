import { type DeploymentId, type RolloutRingLevel, type CanaryMetricObservation, type CanaryObservationWindow, type CanaryVerificationRecord, type SloPolicyConfig } from './deploymentTypes.js';
import { SloPolicyEngine } from './sloPolicyEngine.js';
export declare class CanaryVerificationEngine {
    private readonly sloEngine;
    private verificationRecords;
    constructor(sloEngine?: SloPolicyEngine);
    /**
     * Aggregates raw observations into a deterministic CanaryObservationWindow.
     * Tổng hợp các quan sát thô thành một CanaryObservationWindow xác định.
     */
    aggregateWindow(windowId: string, observations: readonly CanaryMetricObservation[], priorConsecutiveDegradations?: number): CanaryObservationWindow;
    /**
     * Computes a deterministic SHA-256 evidence hash for a verification window and its result.
     * Tính toán mã băm bằng chứng SHA-256 xác định cho cửa sổ xác minh và kết quả của nó.
     */
    computeEvidenceHash(deploymentId: DeploymentId, ringLevel: RolloutRingLevel, window: CanaryObservationWindow, isPassing: boolean, violations: readonly string[]): string;
    /**
     * Executes canary verification against the active SLO policy.
     * Thực hiện xác minh canary theo chính sách SLO đang hoạt động.
     */
    verifyCanary(deploymentId: DeploymentId, ringLevel: RolloutRingLevel, observations: readonly CanaryMetricObservation[], policy?: SloPolicyConfig, priorConsecutiveDegradations?: number): CanaryVerificationRecord;
    /**
     * Retrieves all canary verification records for a given deployment.
     * Lấy tất cả các bản ghi xác minh canary cho một đợt triển khai nhất định.
     */
    getRecords(deploymentId: string): readonly CanaryVerificationRecord[];
}
