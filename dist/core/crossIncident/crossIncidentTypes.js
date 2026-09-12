// src/core/crossIncident/crossIncidentTypes.ts
// BOWCON V4.0 — MS-1.3.57: GOVERNED CROSS-INCIDENT INTELLIGENCE & RESILIENCE MEMORY
//
// Canonical type definitions and DTO contracts for cross-incident correlation,
// historical hypothesis reliability, stratified remediation tracking, systemic
// pattern detection, advisory feedback, cryptographic provenance, and bounded archiving.
// Định nghĩa kiểu chuẩn tắc và các hợp đồng DTO cho tương quan liên sự cố,
// độ tin cậy giả thuyết lịch sử, theo dõi khắc phục phân tầng, phát hiện mẫu hệ thống,
// tư vấn phản hồi quản trị, nguồn gốc mật mã và lưu trữ có giới hạn.
//
// Authority Invariants:
// - Level 0 Read-Only Analysis + Level 1 Advisory Recommendation ONLY.
// - Zero authorization token issuance (issueToken prohibited).
// - Zero supervisory self-approval (approve prohibited).
// - Zero PDP / gate / kill-switch mutation (POLICY_RECOMMENDATION != POLICY_MUTATION).
// - CORRELATION != CAUSATION (humility enforced; correlation ceiling <= 0.95).
export function createIncidentArchiveId(raw) {
    return raw;
}
export function createPatternClusterId(raw) {
    return raw;
}
export function createSystemicPatternId(raw) {
    return raw;
}
export function createAdvisoryId(raw) {
    return raw;
}
export function createCrossIncidentProvenanceId(raw) {
    return raw;
}
