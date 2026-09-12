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

import type { PolicyRing, PolicyCandidateId } from './policyCanaryTypes.js';

// ============================================================================
// BRANDED IDENTIFIERS
// CÁC ĐỊNH DANH ĐƯỢC GẮN NHÃN (BRANDED)
// ============================================================================

export type PolicyCanaryRecoveryId = string & { readonly __brand: unique symbol };
export type PolicyFaultInjectionId = string & { readonly __brand: unique symbol };
export type ConsumedTokenReplayId = string & { readonly __brand: unique symbol };

/**
 * Creates and validates a branded PolicyCanaryRecoveryId.
 * Tạo và xác thực PolicyCanaryRecoveryId có thương hiệu.
 */
export function createPolicyCanaryRecoveryId(raw: string): PolicyCanaryRecoveryId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_POLICY_CANARY_RECOVERY_ID: Recovery ID must be a non-empty string');
  }
  return raw.trim() as PolicyCanaryRecoveryId;
}

/**
 * Creates and validates a branded PolicyFaultInjectionId.
 * Tạo và xác thực PolicyFaultInjectionId có thương hiệu.
 */
export function createPolicyFaultInjectionId(raw: string): PolicyFaultInjectionId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_POLICY_FAULT_INJECTION_ID: Fault Injection ID must be a non-empty string');
  }
  return raw.trim() as PolicyFaultInjectionId;
}

/**
 * Creates and validates a branded ConsumedTokenReplayId.
 * Tạo và xác thực ConsumedTokenReplayId có thương hiệu.
 */
export function createConsumedTokenReplayId(raw: string): ConsumedTokenReplayId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_CONSUMED_TOKEN_REPLAY_ID: Token Replay ID must be a non-empty string');
  }
  return raw.trim() as ConsumedTokenReplayId;
}

// ============================================================================
// CANONICAL FAULT & RECOVERY CLASSIFICATIONS
// PHÂN LOẠI LỖI VÀ PHỤC HỒI CHUẨN TẮC
// ============================================================================

/**
 * Canonical fault types supported by the Policy Canary Fault Injector.
 * Các loại lỗi chuẩn tắc được hỗ trợ bởi Bộ tiêm lỗi Canary chính sách.
 */
export type PolicyCanaryFaultType =
  | 'SHADOW_EVALUATOR_THROW'
  | 'TELEMETRY_AGGREGATOR_DROP'
  | 'HEALTH_EVALUATION_MALFORMED'
  | 'CIRCUIT_BREAKER_INTERNAL_ERROR'
  | 'PERSISTENCE_CORRUPTION'
  | 'PROVENANCE_HASH_BREAK'
  | 'TOKEN_REPLAY_ATTEMPT'
  | 'USER_STOP_HALT'
  | 'STALE_EXPIRED_CANDIDATE'
  | 'PARTIAL_TRANSITION_CRASH';

/**
 * Disposition outcomes of a crash-recovery reconciliation run.
 * Kết quả định đoạt của một lượt đối soát phục hồi sau sự cố.
 */
export type CanaryRecoveryDisposition =
  | 'RECONCILED'
  | 'QUARANTINED'
  | 'RESTORED_TO_BASELINE'
  | 'FAILED_CLOSED';

// ============================================================================
// DTO CONTRACTS & INTERFACES
// CÁC HỢP ĐỒNG VÀ GIAO DIỆN DTO
// ============================================================================

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
