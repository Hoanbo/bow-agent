// src/core/policyCanary/policyCanaryTypes.ts
// BOWCON V4.0 — MS-1.3.60: GOVERNED REAL-TIME POLICY CANARY VERIFICATION & MULTI-RING ROLLOUT PIPELINE
//
// Canonical type definitions and DTO contracts for governed real-time policy canary verification,
// multi-ring progressive rollouts (Ring 0 to Ring 4), shadow evaluation, telemetry aggregation,
// automated health monitoring, fail-closed circuit breaking, ring-scoped rollback, and provenance chains.
//
// Định nghĩa kiểu chuẩn tắc và các hợp đồng DTO cho kiểm chứng canary chính sách thời gian thực có quản trị,
// triển khai lũy tiến đa vòng (Vòng 0 đến Vòng 4), đánh giá bóng (shadow), tổng hợp đo lường từ xa,
// giám sát sức khỏe tự động, ngắt mạch đóng an toàn, hoàn nguyên theo phạm vi vòng và chuỗi nguồn gốc.
//
// Authority Invariants:
// - Level 0 Read-Only Shadow Evaluation / Telemetry Inspection
// - Level 1 Advisory Health Monitoring & Recommendations
// - Level 2 Controlled Progressive Ring Execution
// - CANARY_EVALUATION != POLICY_APPROVAL
// - CANARY_HEALTH != PROMOTION_AUTHORITY
// - SHADOW_EVALUATION != EXECUTION
// - ZERO_AUTONOMOUS_TOKEN_ISSUANCE
// - ZERO_AUTONOMOUS_APPROVAL
// - ZERO_HARD_FORBIDDEN_DOWNGRADE
// - ZERO_CROSS_TENANT_POLICY_LEAK
// - USER_STOP > ALL_CANARY_OPERATIONS
// - FAIL_CLOSED > SPECULATIVE_EXECUTION
/**
 * Creates and validates a branded PolicyCanaryId.
 * Tạo và xác thực PolicyCanaryId có thương hiệu.
 */
export function createPolicyCanaryId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_POLICY_CANARY_ID: Canary ID must be a non-empty string');
    }
    return raw.trim();
}
/**
 * Creates and validates a branded PolicyCandidateId.
 * Tạo và xác thực PolicyCandidateId có thương hiệu.
 */
export function createPolicyCandidateId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_POLICY_CANDIDATE_ID: Candidate ID must be a non-empty string');
    }
    return raw.trim();
}
/**
 * Creates and validates a branded PolicyRingAssignmentId.
 * Tạo và xác thực PolicyRingAssignmentId có thương hiệu.
 */
export function createPolicyRingAssignmentId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_POLICY_RING_ASSIGNMENT_ID: Ring Assignment ID must be a non-empty string');
    }
    return raw.trim();
}
/**
 * Creates and validates a branded PolicyCanaryDeploymentId.
 * Tạo và xác thực PolicyCanaryDeploymentId có thương hiệu.
 */
export function createPolicyCanaryDeploymentId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_POLICY_CANARY_DEPLOYMENT_ID: Deployment ID must be a non-empty string');
    }
    return raw.trim();
}
/**
 * Creates and validates a branded PolicyCanaryObservationId.
 * Tạo và xác thực PolicyCanaryObservationId có thương hiệu.
 */
export function createPolicyCanaryObservationId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_POLICY_CANARY_OBSERVATION_ID: Observation ID must be a non-empty string');
    }
    return raw.trim();
}
/**
 * Creates and validates a branded PolicyCanaryHealthId.
 * Tạo và xác thực PolicyCanaryHealthId có thương hiệu.
 */
export function createPolicyCanaryHealthId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_POLICY_CANARY_HEALTH_ID: Health ID must be a non-empty string');
    }
    return raw.trim();
}
/**
 * Creates and validates a branded PolicyCanaryProvenanceId.
 * Tạo và xác thực PolicyCanaryProvenanceId có thương hiệu.
 */
export function createPolicyCanaryProvenanceId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_POLICY_CANARY_PROVENANCE_ID: Provenance ID must be a non-empty string');
    }
    return raw.trim();
}
export const CANONICAL_POLICY_RINGS = Object.freeze([
    'RING_0',
    'RING_1',
    'RING_2',
    'RING_3',
    'RING_4',
]);
