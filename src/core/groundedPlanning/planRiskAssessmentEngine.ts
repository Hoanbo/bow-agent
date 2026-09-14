// src/core/groundedPlanning/planRiskAssessmentEngine.ts
// BOWCON V4.0 — MS-1.5.07: PLAN RISK ASSESSMENT ENGINE
// Component 1042 — REAL
//
// EN: Evaluates multi-dimensional risk for individual steps and overall action plans.
//     Classifies blast radius, identifies sensitive action payloads, and enforces human confirmation gates.
// VI: Đánh giá rủi ro đa chiều cho từng bước và toàn bộ kế hoạch hành động.
//     Phân loại bán kính ảnh hưởng, nhận diện tải trọng hành động nhạy cảm và thực thi cổng xác nhận từ con người.

import type {
  GroundedPlanIntentType,
  GroundedPlanRiskLevel,
  GroundedActionStep,
} from './groundedPlanTypes.js';

const SENSITIVE_KEYWORDS = Object.freeze([
  'password',
  'secret',
  'api_key',
  'apikey',
  'token',
  'credential',
  'payment',
  'credit_card',
  'checkout',
  'delete',
  'drop_table',
  'transfer',
  'auth',
  'privilege',
  'admin',
]);

const RISK_HIERARCHY: Record<GroundedPlanRiskLevel, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

export class PlanRiskAssessmentEngine {
  /**
   * EN: Classifies risk level for an individual action step based on intent, payload, and quarantine status.
   * VI: Phân loại mức độ rủi ro cho một bước hành động dựa trên ý định, tải trọng và trạng thái kiểm dịch.
   */
  public static classifyStepRisk(
    intentType: GroundedPlanIntentType,
    payload: Readonly<Record<string, unknown>> = {},
    isQuarantinedText = false
  ): GroundedPlanRiskLevel {
    // Quarantined text containing visual instructions is automatically HIGH risk
    // Văn bản trong vùng kiểm dịch chứa chỉ dẫn màn hình tự động nâng lên mức rủi ro HIGH
    if (isQuarantinedText) {
      return 'HIGH';
    }

    // Inspect payload values for sensitive keywords (Quét tải trọng tìm từ khóa nhạy cảm)
    const payloadStr = JSON.stringify(payload).toLowerCase();
    for (const kw of SENSITIVE_KEYWORDS) {
      if (payloadStr.includes(kw)) {
        return 'CRITICAL';
      }
    }

    switch (intentType) {
      case 'CONFIRM':
      case 'CANCEL':
        return 'HIGH';
      case 'INPUT_TEXT':
      case 'SELECT_ELEMENT':
      case 'CUSTOM':
        return 'MEDIUM';
      case 'NAVIGATE':
      case 'INSPECT':
      default:
        return 'LOW';
    }
  }

  /**
   * EN: Computes overall risk level as the supremum (maximum) over all step risks.
   * VI: Tính toán mức rủi ro tổng thể là cận trên (cao nhất) trong tất cả các bước.
   */
  public static calculateOverallRisk(steps: readonly GroundedActionStep[]): GroundedPlanRiskLevel {
    if (steps.length === 0) return 'LOW';

    let maxLevel: GroundedPlanRiskLevel = 'LOW';
    for (const step of steps) {
      if (RISK_HIERARCHY[step.riskLevel] > RISK_HIERARCHY[maxLevel]) {
        maxLevel = step.riskLevel;
      }
    }

    return maxLevel;
  }

  /**
   * EN: Determines if an action plan strictly requires human interactive confirmation.
   * VI: Xác định xem kế hoạch hành động có bắt buộc phải có sự xác nhận tương tác từ con người hay không.
   */
  public static requiresHumanConfirmation(
    overallRisk: GroundedPlanRiskLevel,
    steps: readonly GroundedActionStep[]
  ): boolean {
    if (overallRisk === 'CRITICAL' || overallRisk === 'HIGH') {
      return true;
    }
    return steps.some((s) => s.isQuarantinedText || s.stepConfidence < 0.80);
  }
}
