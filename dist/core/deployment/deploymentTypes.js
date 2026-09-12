// src/core/deployment/deploymentTypes.ts
// BOWCON V4.0 — MS-1.3.52: GOVERNED PRODUCTION DEPLOYMENT & CANARY VERIFICATION PIPELINE
//
// Canonical TypeScript contracts, branded identifiers, and fail-closed state machines for governed production deployment.
// Các hợp đồng TypeScript chuẩn tắc, định danh thương hiệu và máy trạng thái đóng khi thất bại cho việc triển khai sản xuất có quản trị.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - MASTER_OWNER_AUTHORITY > BOW > BOWCON > PROJECTS
// - OWNER_DECISION > BOWCON_RECOMMENDATION
// - USER_STOP > EVERYTHING_AUTONOMOUS
// - REVOCATION > AGENT_INTENT
// - AUTOMATION != OWNER_WILL
// - DEPLOYMENT != OWNER_APPROVAL
// - CANARY_PASS != RELEASE_APPROVAL
// - CANARY_PASS != DEPLOYMENT_AUTHORIZATION
// - DEPLOYMENT_VERIFICATION != OWNER_APPROVAL
// - SLO_HEALTH != AUTHORITY
// - MONITORING_RESULT != AUTHORIZATION
// - ROLLBACK != OWNER_AUTHORITY
// - AGENT_COUNT != AUTHORITY_COUNT
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with PROTECTED_WORKSPACE_VIOLATION).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
export function createDeploymentId(raw) {
    return raw;
}
export function createDeploymentCandidateId(raw) {
    return raw;
}
export function createRolloutRingId(raw) {
    return raw;
}
export function createCanaryVerificationId(raw) {
    return raw;
}
export function createDeploymentEvidenceId(raw) {
    return raw;
}
export function createDeploymentReportId(raw) {
    return raw;
}
export function createCircuitBreakerEventId(raw) {
    return raw;
}
export const TERMINAL_DEPLOYMENT_STATES = [
    'COMPLETED',
    'ROLLED_BACK',
    'BLOCKED',
    'REVOKED',
    'EXPIRED',
    'CANCELLED',
    'CONFLICTED',
    'INVALID',
    'FAILED',
];
export function isTerminalDeploymentState(state) {
    return TERMINAL_DEPLOYMENT_STATES.includes(state);
}
export const ROLLOUT_RING_ORDER = [
    'RING_0',
    'RING_1',
    'RING_2',
    'RING_3',
    'RING_4',
];
export class DeploymentError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(`[${code}] ${message}`);
        this.name = 'DeploymentError';
        this.code = code;
        this.details = details;
        Object.setPrototypeOf(this, DeploymentError.prototype);
    }
}
