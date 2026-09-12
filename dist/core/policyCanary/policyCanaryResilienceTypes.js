// src/core/policyCanary/policyCanaryResilienceTypes.ts
// BOWCON V4.0 — MS-1.3.61: GOVERNED POLICY CANARY RESILIENCE, FAULT INJECTION & FAILURE-RECOVERY VERIFICATION
//
// Canonical type definitions and DTO contracts for canary resilience, fault injection,
// crash-recovery reconciliation, authorization token replay protection, and fail-closed safety.
//
// Định nghĩa kiểu chuẩn tắc và các hợp đồng DTO cho khả năng phục hồi canary, tiêm lỗi,
// đối soát phục hồi sau sự cố, bảo vệ chống phát lại mã ủy quyền và an toàn đóng khi lỗi.
//
// Authority Invariants:
// - Level 0 Read-Only Resilience Inspection & Replay Verification
// - Level 1 Advisory Fault Diagnosis & Health Invalidation
// - Level 2 Controlled Fail-Closed Recovery & Baseline Restoration
// - USER_STOP > ALL_RECOVERY_OPERATIONS
// - CANARY_FAILURE != SAFETY_FLOOR_RELAXATION
// - MISSING_EVIDENCE != POSITIVE_EVIDENCE
// - ZERO_AUTONOMOUS_TOKEN_ISSUANCE
// - ZERO_AUTONOMOUS_APPROVAL
// - ZERO_HARD_FORBIDDEN_DOWNGRADE
// - STRICT_TENANT_ISOLATION
/**
 * Creates and validates a branded PolicyCanaryRecoveryId.
 * Tạo và xác thực PolicyCanaryRecoveryId có thương hiệu.
 */
export function createPolicyCanaryRecoveryId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_POLICY_CANARY_RECOVERY_ID: Recovery ID must be a non-empty string');
    }
    return raw.trim();
}
/**
 * Creates and validates a branded PolicyFaultInjectionId.
 * Tạo và xác thực PolicyFaultInjectionId có thương hiệu.
 */
export function createPolicyFaultInjectionId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_POLICY_FAULT_INJECTION_ID: Fault Injection ID must be a non-empty string');
    }
    return raw.trim();
}
/**
 * Creates and validates a branded ConsumedTokenReplayId.
 * Tạo và xác thực ConsumedTokenReplayId có thương hiệu.
 */
export function createConsumedTokenReplayId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_CONSUMED_TOKEN_REPLAY_ID: Token Replay ID must be a non-empty string');
    }
    return raw.trim();
}
