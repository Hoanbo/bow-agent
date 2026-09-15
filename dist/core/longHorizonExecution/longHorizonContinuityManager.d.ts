import { type GovernedLongHorizonObjective, type LongHorizonGeneration } from './longHorizonExecutionTypes.js';
import { type GroundedPlanTaskBinding } from '../groundedPlanTaskBridge/groundedPlanTaskTypes.js';
export declare class LongHorizonContinuityManager {
    /**
     * EN: Asserts that a new proposed plan or binding does not silently expand the objective scope.
     * VI: Khẳng định rằng kế hoạch hoặc ràng buộc đề xuất mới không âm thầm mở rộng phạm vi mục tiêu.
     */
    assertScopeContinuity(objective: GovernedLongHorizonObjective, binding: GroundedPlanTaskBinding): void;
    /**
     * EN: Asserts that the active generation is fresh and not superseded or aborted.
     * VI: Khẳng định rằng thế hệ đang hoạt động là mới và không bị thay thế hoặc hủy bỏ.
     */
    assertGenerationActive(generation: LongHorizonGeneration): void;
    verifyGenerationActive(generation: LongHorizonGeneration): void;
    /**
     * EN: Asserts that an authorization or confirmation token is fresh and within TTL.
     * VI: Khẳng định rằng ủy quyền hoặc mã xác nhận còn mới và trong thời hạn TTL.
     */
    assertAuthorizationFreshness(objective: GovernedLongHorizonObjective, humanTokenExpiresAt?: string): void;
    /**
     * EN: Comprehensive authorization freshness verification for objective and binding.
     * VI: Xác minh độ tươi ủy quyền toàn diện cho mục tiêu và ràng buộc.
     */
    verifyAuthorizationFreshness(objective: GovernedLongHorizonObjective, binding: GroundedPlanTaskBinding): void;
    detectObjectiveExtension(objective: GovernedLongHorizonObjective, requestedScopes: readonly string[]): void;
    /**
     * EN: Asserts that a lease is strictly bound to the current generation.
     * VI: Khẳng định rằng một hợp đồng thuê được ràng buộc nghiêm ngặt với thế hệ hiện tại.
     */
    assertLeaseGenerationBinding(leaseGenerationId: string, activeGenerationId: string): void;
    verifyLeaseGenerationBinding(leaseGenerationId: string, activeGenerationId: string): void;
    detectRepeatedPlan(planHash: string, history: readonly string[]): void;
}
