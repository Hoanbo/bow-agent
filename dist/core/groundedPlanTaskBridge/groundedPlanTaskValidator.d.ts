import { type GroundedPlanTaskBinding, type GroundedPlanTaskStepBinding, type HumanConfirmationRecord } from './groundedPlanTaskTypes.js';
import type { GroundedActionPlan } from '../groundedPlanning/groundedPlanTypes.js';
export declare class GroundedPlanTaskValidator {
    /**
     * EN: Validates a source GroundedActionPlan before binding preparation.
     * VI: Xác thực GroundedActionPlan nguồn trước khi chuẩn bị ràng buộc.
     */
    static validateSourcePlan(plan: unknown): asserts plan is GroundedActionPlan;
    /**
     * EN: Validates a complete GroundedPlanTaskBinding.
     * VI: Xác thực hoàn chỉnh một GroundedPlanTaskBinding.
     */
    static validateBinding(binding: unknown): asserts binding is GroundedPlanTaskBinding;
    /**
     * EN: Validates an individual step binding.
     * VI: Xác thực một ràng buộc bước riêng lẻ.
     */
    static validateStepBinding(step: unknown, errors: string[]): asserts step is GroundedPlanTaskStepBinding;
    /**
     * EN: Validates human confirmation record structure.
     * VI: Xác thực cấu trúc bản ghi xác nhận con người.
     */
    static validateHumanConfirmation(rec: unknown): asserts rec is HumanConfirmationRecord;
    /**
     * EN: Recursive check for prototype pollution keys.
     * VI: Kiểm tra đệ quy các khóa gây ô nhiễm prototype.
     */
    static assertNoPrototypePollution(obj: unknown, errors: string[], path: string, depth?: number): void;
    /**
     * EN: Recursive check prohibiting Chain-of-Thought (CoT) reasoning markers.
     * VI: Kiểm tra đệ quy cấm các dấu vết suy luận Chain-of-Thought (CoT).
     */
    static assertNoForbiddenCoT(obj: unknown, errors: string[], path: string, depth?: number): void;
}
