import type { PlanRiskLevel } from '../planning/planningTypes.js';
export interface PolicyRules {
    readonly governanceRequired: boolean;
    readonly approvalRequired: boolean;
    readonly destructiveProtection: boolean;
}
/**
 * EN: Authoritative mapping of PlanRiskLevel to governance rules (Section 12 & 13).
 * VI: Ánh xạ có thẩm quyền của PlanRiskLevel sang các quy tắc quản trị (Section 12 & 13).
 */
export declare function getPolicyRulesForRisk(risk: PlanRiskLevel): PolicyRules;
/**
 * EN: Strictly validates that the execution risk has not been downgraded from the decision risk (Section 11).
 * VI: Xác thực nghiêm ngặt rằng rủi ro thực thi không bị hạ cấp từ rủi ro của quyết định (Section 11).
 */
export declare function assertRiskNotDowngraded(decisionRisk: PlanRiskLevel, executionRisk: PlanRiskLevel): {
    valid: boolean;
    reason?: string;
};
