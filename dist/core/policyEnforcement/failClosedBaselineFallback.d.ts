import { type PolicyConfiguration } from '../policyEvolution/policyEvolutionTypes.js';
import type { ActionClassification } from '../policyDecisionPoint.js';
import { type FailClosedReason, type EnforcementDecision } from './policyEnforcementTypes.js';
export declare class FailClosedBaselineFallback {
    private readonly baselineConfig;
    constructor();
    /**
     * Retrieves the immutable nominal baseline policy configuration.
     * Lấy cấu hình chính sách đường cơ sở danh nghĩa bất biến.
     */
    getBaselineConfiguration(): PolicyConfiguration;
    /**
     * Checks if an action is canonically hard-forbidden.
     * Kiểm tra xem một hành động có bị cấm tuyệt đối theo chuẩn tắc hay không.
     */
    isHardForbidden(actionName: string): boolean;
    /**
     * Asserts that a candidate classification does NOT downgrade any hard-forbidden action.
     * Throws an error immediately if an illegal downgrade attempt is detected.
     * Khẳng định rằng phân loại ứng viên KHÔNG hạ cấp bất kỳ hành động bị cấm tuyệt đối nào.
     * Ném ra lỗi ngay lập tức nếu phát hiện nỗ lực hạ cấp bất hợp pháp.
     */
    assertHardForbiddenImmutable(actionName: string, candidateClassification: ActionClassification): void;
    /**
     * Verifies an entire dictionary of action classifications against the immutable safety floor.
     * Returns true if all hard-forbidden actions are preserved, or false if any violation is found.
     * Xác minh toàn bộ từ điển phân loại hành động đối với sàn an toàn bất biến.
     * Trả về true nếu tất cả hành động bị cấm tuyệt đối được bảo toàn, hoặc false nếu tìm thấy vi phạm.
     */
    verifyClassificationSafetyFloor(classifications: Record<string, ActionClassification>): boolean;
    /**
     * Constructs an authoritative fail-closed denial decision.
     * Xây dựng quyết định từ chối đóng an toàn có thẩm quyền.
     */
    createFailClosedDecision(params: {
        readonly toolName: string;
        readonly reason: string;
        readonly failClosedReason: FailClosedReason;
        readonly policyVersion?: string;
    }): EnforcementDecision;
}
export declare const globalFailClosedBaselineFallback: FailClosedBaselineFallback;
