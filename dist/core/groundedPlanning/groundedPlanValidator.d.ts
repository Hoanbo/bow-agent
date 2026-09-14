import { type GroundedActionPlan, type GroundedActionStep, type GroundedPlanSynthesisRequest } from './groundedPlanTypes.js';
export declare class GroundedPlanValidator {
    /**
     * EN: Validates a complete GroundedActionPlan object fails-closed.
     * VI: Xác thực đối tượng GroundedActionPlan hoàn chỉnh theo nguyên tắc đóng-khi-lỗi.
     */
    static validatePlan(plan: unknown): asserts plan is GroundedActionPlan;
    /**
     * EN: Validates a single GroundedActionStep object fails-closed.
     * VI: Xác thực một bước GroundedActionStep riêng lẻ theo nguyên tắc đóng-khi-lỗi.
     */
    static validateStep(step: unknown, expectedIndex?: number): asserts step is GroundedActionStep;
    /**
     * EN: Validates a synthesis request fails-closed.
     * VI: Xác thực yêu cầu tổng hợp kế hoạch theo nguyên tắc đóng-khi-lỗi.
     */
    static validateSynthesisRequest(req: unknown): asserts req is GroundedPlanSynthesisRequest;
    /**
     * EN: Recursive defense against prototype pollution and forbidden Chain-of-Thought (CoT) markers.
     * VI: Phòng thủ đệ quy ngăn ô nhiễm prototype và các token suy luận CoT bị cấm.
     */
    static assertNoPrototypePollutionOrCoT(obj: unknown, context: string, depth?: number): void;
}
