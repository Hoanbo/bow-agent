// src/core/diagnosis/diagnosisTypes.ts
// BOWCON V4.0 — MS-1.3.54: GOVERNED AUTONOMOUS SELF-DIAGNOSIS, INCIDENT CLASSIFICATION & SUPERVISOR DECISION-SUPPORT SYNTHESIS
//
// Canonical TypeScript contracts, branded identifiers, and fail-closed state machines
// for autonomous post-deployment self-diagnosis, incident classification, and decision-support synthesis.
// Các hợp đồng TypeScript chuẩn tắc, định danh thương hiệu và máy trạng thái đóng khi thất bại
// cho việc tự chẩn đoán sau triển khai, phân loại sự cố và tổng hợp hỗ trợ quyết định có quản trị.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - MASTER_OWNER_AUTHORITY > BOW > BOWCON > PROJECTS
// - DIAGNOSIS != EXECUTION
// - ROOT_CAUSE_HYPOTHESIS != FACT
// - CONFIDENCE != AUTHORITY
// - DECISION_PACKAGE != OWNER_DECISION
// - RECOMMENDATION != AUTHORIZATION
// - INCIDENT_CLASSIFICATION != REMEDIATION_PERMISSION
// - AGENT_COUNT != AUTHORITY_COUNT
// - MONITORING_RESULT != EXECUTION_PERMISSION
// - CONFIDENCE_CEILING: Confidence score MUST NEVER exceed 0.95 (Preserve epistemological humility).
// - CONFIDENCE_UNCERTAINTY_SUM: Confidence + Uncertainty MUST EQUAL 1.0.
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with SECURITY_VIOLATION).
// - ZERO AUTONOMOUS REMEDIATION: Proposed actions MUST remain inert DTOs without executable callbacks.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
export function createIncidentId(raw) {
    return raw;
}
export function createHypothesisId(raw) {
    return raw;
}
export function createDecisionPackageId(raw) {
    return raw;
}
export function createEvidenceClusterId(raw) {
    return raw;
}
