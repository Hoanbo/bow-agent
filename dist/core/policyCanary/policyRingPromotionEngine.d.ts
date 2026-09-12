import { type PolicyCandidatePackage, type PromotionRequest, type PromotionResult } from './policyCanaryTypes.js';
import { WorldActionAuthorizationEngine } from '../world-action/worldActionAuthorization.js';
import { PolicyCanaryRecoveryEngine } from './policyCanaryRecoveryEngine.js';
export interface PolicyRingPromotionEngineOptions {
    readonly authEngine?: WorldActionAuthorizationEngine;
    readonly isUserStopActive?: () => boolean;
    readonly recoveryEngine?: PolicyCanaryRecoveryEngine;
}
export declare class PolicyRingPromotionEngine {
    private readonly authEngine;
    private readonly isUserStopActiveFn?;
    private readonly recoveryEngine;
    constructor(options?: PolicyRingPromotionEngineOptions);
    /**
     * Promotes a candidate policy package to the next ring.
     * Consumes human operator authorization token atomically.
     *
     * Thăng hạng một gói chính sách ứng viên lên vòng tiếp theo.
     * Tiêu thụ mã ủy quyền của người vận hành là con người theo cơ chế nguyên tử.
     */
    promote(candidate: PolicyCandidatePackage, request: PromotionRequest): {
        readonly updatedCandidate: PolicyCandidatePackage;
        readonly result: PromotionResult;
    };
    /**
     * Resolves the strictly sequential next ring in the hierarchy.
     * Giải quyết vòng tiếp theo theo thứ tự tuần tự nghiêm ngặt trong phân cấp.
     */
    private getExpectedNextRing;
    /**
     * Maps a target ring to the corresponding lifecycle state.
     * Ánh xạ một vòng mục tiêu tới trạng thái vòng đời tương ứng.
     */
    private mapRingToLifecycleState;
    private calculateChecksum;
}
export declare const globalPolicyRingPromotionEngine: PolicyRingPromotionEngine;
