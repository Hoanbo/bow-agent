// src/core/orchestration/executionPolicy.ts
// BOWCON V4.0 — MILESTONE 1.3.11: EXECUTION POLICY & RISK PRESERVATION
//
// EN:
// Defines authoritative mapping between Risk Levels, Governance, and Approval requirements.
// Strictly enforces monotonic risk preservation: risk can never be downgraded.
//
// VI:
// Định nghĩa ánh xạ có thẩm quyền giữa Cấp độ Rủi ro, Quản trị và Yêu cầu Phê duyệt.
// Nghiêm ngặt thực thi tính đơn điệu bảo tồn rủi ro: rủi ro không bao giờ được hạ cấp.
const RISK_RANK = Object.freeze({
    LOW: 0,
    MEDIUM: 1,
    HIGH: 2,
    CRITICAL: 3,
});
/**
 * EN: Authoritative mapping of PlanRiskLevel to governance rules (Section 12 & 13).
 * VI: Ánh xạ có thẩm quyền của PlanRiskLevel sang các quy tắc quản trị (Section 12 & 13).
 */
export function getPolicyRulesForRisk(risk) {
    switch (risk) {
        case 'CRITICAL':
            return Object.freeze({
                governanceRequired: true,
                approvalRequired: true,
                destructiveProtection: true,
            });
        case 'HIGH':
            return Object.freeze({
                governanceRequired: true,
                approvalRequired: true,
                destructiveProtection: false,
            });
        case 'MEDIUM':
            return Object.freeze({
                governanceRequired: true,
                approvalRequired: false,
                destructiveProtection: false,
            });
        case 'LOW':
        default:
            return Object.freeze({
                governanceRequired: false,
                approvalRequired: false,
                destructiveProtection: false,
            });
    }
}
/**
 * EN: Strictly validates that the execution risk has not been downgraded from the decision risk (Section 11).
 * VI: Xác thực nghiêm ngặt rằng rủi ro thực thi không bị hạ cấp từ rủi ro của quyết định (Section 11).
 */
export function assertRiskNotDowngraded(decisionRisk, executionRisk) {
    const decRank = RISK_RANK[decisionRisk] ?? 0;
    const execRank = RISK_RANK[executionRisk] ?? 0;
    if (execRank < decRank) {
        return {
            valid: false,
            reason: `RISK_DOWNGRADE_FORBIDDEN: Attempted downgrade from ${decisionRisk} to ${executionRisk}`,
        };
    }
    return { valid: true };
}
