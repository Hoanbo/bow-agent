import type { PolicyRing, PolicyCandidateId } from './policyCanaryTypes.js';
export type PolicyCanaryRecoveryId = string & {
    readonly __brand: unique symbol;
};
export type PolicyFaultInjectionId = string & {
    readonly __brand: unique symbol;
};
export type ConsumedTokenReplayId = string & {
    readonly __brand: unique symbol;
};
/**
 * Creates and validates a branded PolicyCanaryRecoveryId.
 * Tạo và xác thực PolicyCanaryRecoveryId có thương hiệu.
 */
export declare function createPolicyCanaryRecoveryId(raw: string): PolicyCanaryRecoveryId;
/**
 * Creates and validates a branded PolicyFaultInjectionId.
 * Tạo và xác thực PolicyFaultInjectionId có thương hiệu.
 */
export declare function createPolicyFaultInjectionId(raw: string): PolicyFaultInjectionId;
/**
 * Creates and validates a branded ConsumedTokenReplayId.
 * Tạo và xác thực ConsumedTokenReplayId có thương hiệu.
 */
export declare function createConsumedTokenReplayId(raw: string): ConsumedTokenReplayId;
/**
 * Canonical fault types supported by the Policy Canary Fault Injector.
 * Các loại lỗi chuẩn tắc được hỗ trợ bởi Bộ tiêm lỗi Canary chính sách.
 */
export type PolicyCanaryFaultType = 'SHADOW_EVALUATOR_THROW' | 'TELEMETRY_AGGREGATOR_DROP' | 'HEALTH_EVALUATION_MALFORMED' | 'CIRCUIT_BREAKER_INTERNAL_ERROR' | 'PERSISTENCE_CORRUPTION' | 'PROVENANCE_HASH_BREAK' | 'TOKEN_REPLAY_ATTEMPT' | 'USER_STOP_HALT' | 'STALE_EXPIRED_CANDIDATE' | 'PARTIAL_TRANSITION_CRASH';
/**
 * Disposition outcomes of a crash-recovery reconciliation run.
 * Kết quả định đoạt của một lượt đối soát phục hồi sau sự cố.
 */
export type CanaryRecoveryDisposition = 'RECONCILED' | 'QUARANTINED' | 'RESTORED_TO_BASELINE' | 'FAILED_CLOSED';
/**
 * Single-use human authorization token consumption record.
 * Prevents authorization replay across rings, candidates, or tenants.
 *
 * Bản ghi tiêu thụ mã ủy quyền người vận hành sử dụng một lần.
 * Ngăn chặn việc phát lại mã ủy quyền qua các vòng, ứng viên hoặc người thuê.
 */
export interface ConsumedTokenLedgerRecord {
    readonly replayId: ConsumedTokenReplayId;
    readonly tokenHash: string;
    readonly candidateId: PolicyCandidateId;
    readonly targetRing: PolicyRing;
    readonly tenantPartition: string;
    readonly consumedAt: string;
    readonly consumedBy: string;
}
/**
 * Result of a tenant-isolated canary crash-recovery reconciliation.
 * Kết quả của một lượt đối soát phục hồi sự cố canary cô lập người thuê.
 */
export interface CanaryRecoveryResult {
    readonly recoveryId: PolicyCanaryRecoveryId;
    readonly tenantPartition: string;
    readonly timestamp: string;
    readonly disposition: CanaryRecoveryDisposition;
    readonly reconciledCandidates: number;
    readonly quarantinedCandidates: number;
    readonly restoredToBaseline: boolean;
    readonly activeRing: PolicyRing;
    readonly details: readonly string[];
}
/**
 * Controlled synthetic fault injection configuration rule.
 * Quy tắc cấu hình tiêm lỗi tổng hợp có kiểm soát.
 */
export interface FaultInjectionRule {
    readonly id: PolicyFaultInjectionId;
    readonly faultType: PolicyCanaryFaultType;
    readonly tenantPartition?: string;
    readonly candidateId?: string;
    readonly toolName?: string;
    readonly targetRing?: PolicyRing;
    readonly active: boolean;
    readonly triggerOnce: boolean;
    readonly errorMessage?: string;
}
