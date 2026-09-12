import { type DeploymentRequest, type DeploymentCandidate, type DeploymentTarget, type RolloutRingLevel } from './deploymentTypes.js';
export declare class DeploymentPolicyEngine {
    /**
     * Asserts that a target path does not touch the protected workspace C:\BOW\shopofbow.
     * Khẳng định rằng đường dẫn mục tiêu không chạm vào không gian làm việc được bảo vệ C:\BOW\shopofbow.
     */
    assertProtectedWorkspaceIsolation(targetPath: string): void;
    /**
     * Validates target boundaries and path traversal guards.
     * Xác thực ranh giới mục tiêu và các biện pháp bảo vệ duyệt đường dẫn.
     */
    validateTarget(target: DeploymentTarget): void;
    /**
     * Validates deployment candidate freshness, fingerprint, and expiration.
     * Xác thực độ tươi mới, vân tay và thời hạn của ứng viên triển khai.
     */
    validateCandidate(candidate: DeploymentCandidate): void;
    /**
     * Validates deployment request integrity, bindings, and emergency flags.
     * Xác thực tính toàn vẹn của yêu cầu triển khai, các ràng buộc và cờ khẩn cấp.
     */
    validateRequest(request: DeploymentRequest, candidate: DeploymentCandidate, options?: {
        readonly isUserStopActive?: boolean;
        readonly isRevoked?: boolean;
    }): void;
    /**
     * Validates that ring progression follows the deterministic rollout ring order without illegal skips.
     * Xác thực rằng tiến trình vòng tuân theo thứ tự vòng triển khai xác định mà không nhảy cóc trái phép.
     */
    validateRingProgression(currentRing: RolloutRingLevel, nextRing: RolloutRingLevel): void;
}
