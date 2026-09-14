import type { GroundedPlanIntentType, GroundedPlanRiskLevel, GroundedActionStep } from './groundedPlanTypes.js';
export declare class PlanRiskAssessmentEngine {
    /**
     * EN: Classifies risk level for an individual action step based on intent, payload, and quarantine status.
     * VI: Phân loại mức độ rủi ro cho một bước hành động dựa trên ý định, tải trọng và trạng thái kiểm dịch.
     */
    static classifyStepRisk(intentType: GroundedPlanIntentType, payload?: Readonly<Record<string, unknown>>, isQuarantinedText?: boolean): GroundedPlanRiskLevel;
    /**
     * EN: Computes overall risk level as the supremum (maximum) over all step risks.
     * VI: Tính toán mức rủi ro tổng thể là cận trên (cao nhất) trong tất cả các bước.
     */
    static calculateOverallRisk(steps: readonly GroundedActionStep[]): GroundedPlanRiskLevel;
    /**
     * EN: Determines if an action plan strictly requires human interactive confirmation.
     * VI: Xác định xem kế hoạch hành động có bắt buộc phải có sự xác nhận tương tác từ con người hay không.
     */
    static requiresHumanConfirmation(overallRisk: GroundedPlanRiskLevel, steps: readonly GroundedActionStep[]): boolean;
}
