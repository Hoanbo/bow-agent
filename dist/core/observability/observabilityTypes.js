// src/core/observability/observabilityTypes.ts
// BOWCON V4.0 — MS-1.3.53: GOVERNED POST-DEPLOYMENT AUTONOMOUS VERIFICATION,
// DRIFT DETECTION & OBSERVABILITY TELEMETRY MESH
//
// Canonical TypeScript contracts, branded identifiers, and fail-closed state machines
// for continuous post-deployment observation, drift detection, and advisory reporting.
// Các hợp đồng TypeScript chuẩn tắc, định danh thương hiệu và máy trạng thái đóng khi thất bại
// cho việc quan sát liên tục sau triển khai, phát hiện sai lệch và báo cáo khuyến nghị.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - MASTER_OWNER_AUTHORITY > BOW > BOWCON > PROJECTS
// - OWNER_DECISION > BOWCON_RECOMMENDATION
// - USER_STOP > EVERYTHING_AUTONOMOUS
// - REVOCATION > AGENT_INTENT
// - AUTOMATION != OWNER_WILL
// - OBSERVATION != INTERPRETATION
// - INTERPRETATION != AUTHORITY
// - HEALTH != AUTHORITY
// - DRIFT_DETECTION != AUTHORIZATION
// - TELEMETRY != AUTHORIZATION
// - ALERT != OWNER_APPROVAL
// - RECOMMENDATION != EXECUTION
// - AGENT_COUNT != AUTHORITY_COUNT
// - MONITORING_RESULT != EXECUTION_PERMISSION
// - SUPERVISOR_HEALTH_REPORT != OWNER_APPROVAL
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with PROTECTED_WORKSPACE_VIOLATION).
//
// DO NOT introduce APPROVED, AUTHORIZED, EXECUTED or OWNER_APPROVED states into observation state machines!
// KHÔNG ĐƯỢC đưa các trạng thái APPROVED, AUTHORIZED, EXECUTED hoặc OWNER_APPROVED vào máy trạng thái quan sát!
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
export function createObservationId(raw) {
    return raw;
}
export function createTelemetrySampleId(raw) {
    return raw;
}
export function createHealthCheckId(raw) {
    return raw;
}
export function createDriftDetectionId(raw) {
    return raw;
}
export function createDriftEventId(raw) {
    return raw;
}
export function createInvariantCheckId(raw) {
    return raw;
}
export function createHealthReportId(raw) {
    return raw;
}
export function createObservabilitySessionId(raw) {
    return raw;
}
export function createObservabilityAlertId(raw) {
    return raw;
}
export const TERMINAL_SESSION_STATES = [
    'CONCLUDED',
    'BLOCKED',
    'REVOKED',
];
export function isTerminalSessionState(state) {
    return TERMINAL_SESSION_STATES.includes(state);
}
