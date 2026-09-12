// src/core/policyCanary/policyCanaryCircuitBreaker.ts
// BOWCON V4.0 — MS-1.3.60: GOVERNED REAL-TIME POLICY CANARY VERIFICATION & MULTI-RING ROLLOUT PIPELINE
//
// Governed Policy Canary Circuit Breaker.
// Implements an immediate, fail-closed safety interlock that trips upon detecting safety regressions,
// hard-forbidden downgrade attempts, checksum tampering, active drift, or USER_STOP.
//
// Bộ ngắt mạch canary chính sách có quản trị.
// Thực thi khóa liên động an toàn đóng ngay lập tức khi phát hiện thoái lui an toàn,
// nỗ lực hạ cấp hành động bị cấm tuyệt đối, làm giả mã kiểm tra, độ lệch hoạt động hoặc USER_STOP.
//
// Authority Invariants:
// - Fail-closed on trip: Immediately halts candidate execution and reverts to active baseline.
// - Human-gated reset: Circuit breaker CANNOT be autonomously reset.
// - Absolute USER_STOP precedence: Automatic trip when USER_STOP is active.
// - Permanent hard-forbidden immutability.

import {
  type CircuitBreakerStatus,
  type PolicyCanaryFailureReason,
} from './policyCanaryTypes.js';
import { globalAuditLedger } from '../auditLedger.js';
import { PolicyViolationAuditor, globalPolicyViolationAuditor } from '../policyEnforcement/policyViolationAuditor.js';

export interface PolicyCanaryCircuitBreakerOptions {
  readonly auditor?: PolicyViolationAuditor;
  readonly isUserStopActive?: () => boolean;
}

export class PolicyCanaryCircuitBreaker {
  private readonly auditor: PolicyViolationAuditor;
  private readonly isUserStopActiveFn?: () => boolean;

  // Circuit breaker state keyed by tenantPartition (or 'GLOBAL')
  private readonly states = new Map<string, CircuitBreakerStatus>();

  constructor(options?: PolicyCanaryCircuitBreakerOptions) {
    this.auditor = options?.auditor ?? globalPolicyViolationAuditor;
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  /**
   * Checks whether the circuit breaker is tripped for a tenant partition.
   * If USER_STOP is active, always returns tripped (fail-closed).
   *
   * Kiểm tra xem bộ ngắt mạch có bị ngắt cho một phân vùng người thuê hay không.
   * Nếu USER_STOP đang hoạt động, luôn trả về bị ngắt (đóng an toàn).
   */
  public isTripped(tenantPartition: string): boolean {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      return true;
    }

    const globalState = this.states.get('GLOBAL');
    if (globalState && globalState.tripped) {
      return true;
    }

    const tenantState = this.states.get(tenantPartition);
    return tenantState ? tenantState.tripped : false;
  }

  /**
   * Retrieves the current circuit breaker status for a tenant partition.
   * Lấy trạng thái bộ ngắt mạch hiện tại cho phân vùng người thuê.
   */
  public getStatus(tenantPartition: string): CircuitBreakerStatus {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      return {
        tripped: true,
        tripReason: 'USER_STOP',
        trippedAt: new Date().toISOString(),
        details: 'OPERATION_SUSPENDED_BY_USER_STOP: Emergency stop active',
      };
    }

    const tenantState = this.states.get(tenantPartition);
    if (tenantState) return tenantState;

    const globalState = this.states.get('GLOBAL');
    if (globalState) return globalState;

    return { tripped: false };
  }

  /**
   * Immediately trips the circuit breaker fail-closed.
   * Ngay lập tức ngắt mạch đóng an toàn.
   */
  public trip(input: {
    readonly tenantPartition: string;
    readonly reason: PolicyCanaryFailureReason;
    readonly details?: string;
    readonly trippedBy?: string;
  }): CircuitBreakerStatus {
    const { tenantPartition, reason, details, trippedBy } = input;
    const status: CircuitBreakerStatus = {
      tripped: true,
      tripReason: reason,
      trippedAt: new Date().toISOString(),
      trippedBy: trippedBy || 'system_circuit_breaker',
      details: details || `Circuit breaker tripped due to ${reason}`,
    };

    this.states.set(tenantPartition, status);

    // Record in global Audit Ledger under POLICY_CANARY domain
    globalAuditLedger.record({
      timestamp: status.trippedAt!,
      actor: { userId: trippedBy || 'circuit_breaker', role: 'system', channel: 'internal' },
      domain: 'shop',
      toolName: 'policy_canary_circuit_breaker',
      classification: 'HIGH_IMPACT',
      policyDecision: 'DENY',
      executionStatus: 'BLOCKED',
      argumentsHash: 'CIRCUIT_BREAKER_TRIPPED',
    });

    // Record violation audit
    this.auditor.recordViolation({
      tenantPartition,
      eventType: 'POLICY_REJECTED',
      reason: status.details!,
      details: { reason, trippedBy: status.trippedBy },
    });

    return status;
  }

  /**
   * Resets the circuit breaker.
   * STRICT INVARIANT: Requires human operator confirmation. Autonomous reset is FORBIDDEN.
   *
   * Đặt lại bộ ngắt mạch.
   * BẤT BIẾN NGHIÊM NGẶT: Yêu cầu xác nhận của người vận hành là con người. Đặt lại tự động bị CẤM.
   */
  public reset(tenantPartition: string, operatorUserId: string, reason: string): CircuitBreakerStatus {
    if (!operatorUserId || operatorUserId === 'anonymous' || operatorUserId.includes('autonomous')) {
      throw new Error('SECURITY_INVARIANT_VIOLATION: Circuit breaker cannot be reset autonomously');
    }

    const status: CircuitBreakerStatus = {
      tripped: false,
      details: `Reset by operator '${operatorUserId}': ${reason}`,
    };

    this.states.set(tenantPartition, status);

    globalAuditLedger.record({
      timestamp: new Date().toISOString(),
      actor: { userId: operatorUserId, role: 'operator', channel: 'admin' },
      domain: 'shop',
      toolName: 'policy_canary_circuit_breaker_reset',
      classification: 'HIGH_IMPACT',
      policyDecision: 'PERMIT',
      executionStatus: 'SUCCESS',
      argumentsHash: 'CIRCUIT_BREAKER_RESET',
    });

    return status;
  }

  /**
   * Clears all states (used during testing).
   * Xóa tất cả trạng thái (dùng trong thử nghiệm).
   */
  public clear(): void {
    this.states.clear();
  }
}

export const globalPolicyCanaryCircuitBreaker = new PolicyCanaryCircuitBreaker();
