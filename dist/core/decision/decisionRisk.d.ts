import type { PlanRiskLevel } from '../planning/planningTypes.js';
/**
 * EN: Preserves planning risk and allows escalation, but strictly rejects risk downgrading (INV-7).
 * VI: Bảo tồn rủi ro từ planning và cho phép nâng cấp rủi ro, nhưng nghiêm cấm hạ cấp rủi ro (INV-7).
 */
export declare function preserveRisk(planningRisk: PlanRiskLevel, candidateRisk?: PlanRiskLevel): PlanRiskLevel;
/**
 * EN: Checks if a given risk level requires governance evaluation (MEDIUM, HIGH, CRITICAL).
 * VI: Kiểm tra xem mức độ rủi ro có yêu cầu đánh giá quản trị hay không (MEDIUM, HIGH, CRITICAL).
 */
export declare function isGovernedRisk(risk: PlanRiskLevel): boolean;
/**
 * EN: Checks if a given risk level requires human approval (HIGH, CRITICAL).
 * VI: Kiểm tra xem mức độ rủi ro có yêu cầu phê duyệt từ con người hay không (HIGH, CRITICAL).
 */
export declare function isApprovalRequiredForRisk(risk: PlanRiskLevel, planRequiresApproval: boolean): boolean;
