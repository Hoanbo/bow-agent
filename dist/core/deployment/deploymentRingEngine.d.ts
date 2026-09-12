import { type RolloutRingLevel, type RolloutRingDefinition } from './deploymentTypes.js';
export declare const CANONICAL_ROLLOUT_RINGS: Record<RolloutRingLevel, RolloutRingDefinition>;
export interface RingTransitionRecord {
    readonly deploymentId: string;
    readonly fromRing: RolloutRingLevel;
    readonly toRing: RolloutRingLevel;
    readonly transitionedAt: number;
    readonly authorizedByTokenId: string;
    readonly canaryVerificationId?: string;
}
export declare class DeploymentRingEngine {
    private transitionHistory;
    /**
     * Retrieves the immutable definition for a given rollout ring level.
     * Lấy định nghĩa bất biến cho một mức vòng triển khai nhất định.
     */
    getRingDefinition(ring: RolloutRingLevel): RolloutRingDefinition;
    /**
     * Computes the next sequential rollout ring in order.
     * Tính toán vòng triển khai tuần tự tiếp theo theo thứ tự.
     */
    getNextRing(currentRing: RolloutRingLevel): RolloutRingLevel | null;
    /**
     * Evaluates if advancing from currentRing to targetRing is technically permissible.
     * Đánh giá xem việc tiến từ currentRing sang targetRing có được phép về mặt kỹ thuật hay không.
     */
    canAdvance(options: {
        readonly currentRing: RolloutRingLevel;
        readonly targetRing: RolloutRingLevel;
        readonly isCanaryPassed: boolean;
        readonly isCircuitOpen: boolean;
        readonly isUserStopActive: boolean;
        readonly isRevoked: boolean;
    }): {
        readonly allowed: boolean;
        readonly reason?: string;
    };
    /**
     * Records a deterministic ring transition.
     * Ghi nhận một quá trình chuyển đổi vòng xác định.
     */
    recordTransition(record: RingTransitionRecord): void;
    /**
     * Retrieves the full transition history for a deployment.
     * Lấy toàn bộ lịch sử chuyển đổi cho một đợt triển khai.
     */
    getHistory(deploymentId: string): readonly RingTransitionRecord[];
}
