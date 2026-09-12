import { type DeploymentId, type RolloutRingLevel, type DeploymentAgentAssertion, type DeploymentContradictionRecord } from './deploymentTypes.js';
export declare class DeploymentContradictionEngine {
    private contradictions;
    /**
     * Analyzes multiple agent assertions for conflicting statuses, scores, or evidence.
     * Phân tích nhiều khẳng định của tác nhân để tìm các trạng thái, điểm số hoặc bằng chứng xung đột.
     */
    detectContradictions(deploymentId: DeploymentId, ringLevel: RolloutRingLevel, assertions: readonly DeploymentAgentAssertion[]): DeploymentContradictionRecord | null;
    /**
     * Retrieves all contradiction records for a deployment.
     * Lấy tất cả các bản ghi mâu thuẫn cho một đợt triển khai.
     */
    getContradictions(deploymentId: DeploymentId): readonly DeploymentContradictionRecord[];
}
