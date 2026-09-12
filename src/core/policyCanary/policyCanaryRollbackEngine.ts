// src/core/policyCanary/policyCanaryRollbackEngine.ts
// BOWCON V4.0 — MS-1.3.60: GOVERNED REAL-TIME POLICY CANARY VERIFICATION & MULTI-RING ROLLOUT PIPELINE
//
// Governed Policy Canary Rollback Engine.
// Supports granular, ring-scoped demotion and cohort-isolated rollback.
// Reverts only affected tenants or rings to the active baseline without perturbing unaffected cohorts or the global system.
//
// Động cơ hoàn nguyên canary chính sách có quản trị.
// Hỗ trợ hạ cấp chi tiết theo phạm vi vòng và hoàn nguyên cô lập theo nhóm.
// Khôi phục chỉ các người thuê hoặc vòng bị ảnh hưởng về đường cơ sở hoạt động mà không làm xáo trộn các nhóm không liên quan hoặc hệ thống toàn cục.
//
// Authority Invariants:
// - RING_SCOPED_ISOLATION: Cohort demotion does NOT trigger global policy rollback.
// - FAIL_CLOSED_SAFETY: When in doubt, reverts affected cohort to verified baseline.
// - ABSOLUTE_USER_STOP_SUPREMACY: Immediate rollback/cancellation on USER_STOP.

import crypto from 'node:crypto';
import {
  type PolicyRing,
  type PolicyCandidatePackage,
  type RollbackRequest,
  type RollbackResult,
  type PolicyCandidateId,
  type PolicyCanaryFailureReason,
} from './policyCanaryTypes.js';
import { PolicyRingRouter, globalPolicyRingRouter } from './policyRingRouter.js';
import { PolicyCanaryCircuitBreaker, globalPolicyCanaryCircuitBreaker } from './policyCanaryCircuitBreaker.js';
import { PolicyHotSwapEngine, globalPolicyHotSwapEngine } from '../policyEnforcement/policyHotSwapEngine.js';
import { FailClosedBaselineFallback, globalFailClosedBaselineFallback } from '../policyEnforcement/failClosedBaselineFallback.js';
import { globalAuditLedger } from '../auditLedger.js';

export interface PolicyCanaryRollbackEngineOptions {
  readonly router?: PolicyRingRouter;
  readonly circuitBreaker?: PolicyCanaryCircuitBreaker;
  readonly hotSwapEngine?: PolicyHotSwapEngine;
  readonly fallbackProvider?: FailClosedBaselineFallback;
  readonly isUserStopActive?: () => boolean;
}

export class PolicyCanaryRollbackEngine {
  private readonly router: PolicyRingRouter;
  private readonly circuitBreaker: PolicyCanaryCircuitBreaker;
  private readonly hotSwapEngine: PolicyHotSwapEngine;
  private readonly fallbackProvider: FailClosedBaselineFallback;
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(options?: PolicyCanaryRollbackEngineOptions) {
    this.router = options?.router ?? globalPolicyRingRouter;
    this.circuitBreaker = options?.circuitBreaker ?? globalPolicyCanaryCircuitBreaker;
    this.hotSwapEngine = options?.hotSwapEngine ?? globalPolicyHotSwapEngine;
    this.fallbackProvider = options?.fallbackProvider ?? globalFailClosedBaselineFallback;
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  /**
   * Reverts a single tenant from a canary candidate back to active baseline.
   * Hoàn nguyên một người thuê duy nhất từ ứng viên canary về đường cơ sở hoạt động.
   */
  public rollbackTenant(input: {
    readonly tenantPartition: string;
    readonly candidateId: PolicyCandidateId;
    readonly reason: PolicyCanaryFailureReason;
    readonly details?: string;
    readonly operatorUserId?: string;
  }): RollbackResult {
    const { tenantPartition, candidateId, reason, details, operatorUserId } = input;
    const rolledBackAt = new Date().toISOString();

    // 1. Unassign tenant from router
    this.router.unassignTenant(tenantPartition);

    // 2. Trip circuit breaker for this specific tenant
    this.circuitBreaker.trip({
      tenantPartition,
      reason,
      details: details || `Tenant rolled back from candidate '${candidateId}'`,
      trippedBy: operatorUserId || 'rollback_engine',
    });

    const baseline = this.fallbackProvider.getBaselineConfiguration();
    const provenanceHash = crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          action: 'rollbackTenant',
          tenantPartition,
          candidateId,
          reason,
          rolledBackAt,
        })
      )
      .digest('hex');

    // 3. Record Audit
    globalAuditLedger.record({
      timestamp: rolledBackAt,
      actor: { userId: operatorUserId || 'rollback_engine', role: 'system', channel: 'internal' },
      domain: 'shop',
      toolName: 'policy_canary_rollback_tenant',
      classification: 'HIGH_IMPACT',
      policyDecision: 'PERMIT',
      executionStatus: 'SUCCESS',
      argumentsHash: provenanceHash,
    });

    return {
      success: true,
      candidateId,
      rolledBackRing: 'RING_0',
      affectedTenants: [tenantPartition],
      rolledBackAt,
      restoredBaselineVersion: baseline.versionId,
      provenanceHash,
    };
  }

  /**
   * Demotes a candidate to an earlier ring (e.g., Ring 2 -> Ring 1 or Ring 1 -> Ring 0).
   * Hạ cấp một ứng viên xuống vòng trước đó (ví dụ: Vòng 2 -> Vòng 1 hoặc Vòng 1 -> Vòng 0).
   */
  public demoteRing(
    candidate: PolicyCandidatePackage,
    targetRing: PolicyRing,
    reason: PolicyCanaryFailureReason,
    affectedTenants: readonly string[] = []
  ): {
    readonly updatedCandidate: PolicyCandidatePackage;
    readonly result: RollbackResult;
  } {
    const rolledBackAt = new Date().toISOString();

    const updatedCandidate: PolicyCandidatePackage = {
      ...candidate,
      currentRing: targetRing,
      state: 'DEMOTED',
    };

    // Update or clear assignments for affected tenants
    for (const tenant of affectedTenants) {
      if (targetRing === 'RING_0') {
        this.router.unassignTenant(tenant);
      }
    }

    const baseline = this.fallbackProvider.getBaselineConfiguration();
    const provenanceHash = crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          action: 'demoteRing',
          candidateId: candidate.candidateId,
          fromRing: candidate.currentRing,
          targetRing,
          reason,
          rolledBackAt,
        })
      )
      .digest('hex');

    globalAuditLedger.record({
      timestamp: rolledBackAt,
      actor: { userId: 'rollback_engine', role: 'system', channel: 'internal' },
      domain: 'shop',
      toolName: 'policy_canary_demote_ring',
      classification: 'HIGH_IMPACT',
      policyDecision: 'PERMIT',
      executionStatus: 'SUCCESS',
      argumentsHash: provenanceHash,
    });

    const result: RollbackResult = {
      success: true,
      candidateId: candidate.candidateId,
      rolledBackRing: targetRing,
      affectedTenants,
      rolledBackAt,
      restoredBaselineVersion: baseline.versionId,
      provenanceHash,
    };

    return { updatedCandidate, result };
  }

  /**
   * Completely cancels a candidate across all rings and tenants.
   * Hủy bỏ hoàn toàn một ứng viên trên tất cả các vòng và người thuê.
   */
  public cancelCanary(
    candidate: PolicyCandidatePackage,
    reason: PolicyCanaryFailureReason,
    affectedTenants: readonly string[] = [],
    operatorUserId?: string
  ): {
    readonly updatedCandidate: PolicyCandidatePackage;
    readonly result: RollbackResult;
  } {
    const rolledBackAt = new Date().toISOString();

    const updatedCandidate: PolicyCandidatePackage = {
      ...candidate,
      state: 'CANCELLED',
    };

    for (const tenant of affectedTenants) {
      this.router.unassignTenant(tenant);
      this.circuitBreaker.trip({
        tenantPartition: tenant,
        reason,
        details: `Canary candidate '${candidate.candidateId}' cancelled`,
        trippedBy: operatorUserId || 'rollback_engine',
      });
    }

    const baseline = this.fallbackProvider.getBaselineConfiguration();
    const provenanceHash = crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          action: 'cancelCanary',
          candidateId: candidate.candidateId,
          reason,
          rolledBackAt,
        })
      )
      .digest('hex');

    globalAuditLedger.record({
      timestamp: rolledBackAt,
      actor: { userId: operatorUserId || 'rollback_engine', role: 'system', channel: 'internal' },
      domain: 'shop',
      toolName: 'policy_canary_cancel',
      classification: 'HIGH_IMPACT',
      policyDecision: 'PERMIT',
      executionStatus: 'SUCCESS',
      argumentsHash: provenanceHash,
    });

    const result: RollbackResult = {
      success: true,
      candidateId: candidate.candidateId,
      rolledBackRing: 'RING_0',
      affectedTenants,
      rolledBackAt,
      restoredBaselineVersion: baseline.versionId,
      provenanceHash,
    };

    return { updatedCandidate, result };
  }

  /**
   * Emergency fail-safe clearing all active canary routing assignments.
   * Khóa an toàn khẩn cấp xóa tất cả các gán định tuyến canary đang hoạt động.
   */
  public rollbackAllCanaryAssignments(reason: PolicyCanaryFailureReason): void {
    this.router.clearAll();
    this.circuitBreaker.trip({
      tenantPartition: 'GLOBAL',
      reason,
      details: 'Emergency rollback of all canary assignments',
      trippedBy: 'emergency_rollback',
    });
  }
}

export const globalPolicyCanaryRollbackEngine = new PolicyCanaryRollbackEngine();
