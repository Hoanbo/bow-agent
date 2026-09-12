// src/core/policyCanary/policyRingRouter.ts
// BOWCON V4.0 — MS-1.3.60: GOVERNED REAL-TIME POLICY CANARY VERIFICATION & MULTI-RING ROLLOUT PIPELINE
//
// Governed Policy Ring Router.
// Maps tenant partitions, cohorts, and requests to appropriate policy configurations (Active vs Candidate)
// based on assigned deployment rings (Ring 0 to Ring 4).
//
// Bộ định tuyến vòng chính sách có quản trị.
// Ánh xạ các phân vùng người thuê, nhóm và yêu cầu tới cấu hình chính sách thích hợp (Hoạt động vs Ứng viên)
// dựa trên các vòng triển khai được gán (Vòng 0 đến Vòng 4).
//
// Routing Rules:
// - RING_0 (SHADOW): Returns ACTIVE policy for execution. Candidate is returned ONLY for shadow evaluation.
// - RING_1–RING_3 (COHORT CANARY): Returns candidate policy ONLY for explicitly assigned tenants.
// - RING_4 (GLOBAL): Returns globally promoted candidate policy.
// - Invalid / expired / stale / tampered candidate -> FAIL CLOSED to baseline fallback.
// - Anonymous / unauthenticated -> FAIL CLOSED.
// - USER_STOP -> Immediate halt with OPERATION_SUSPENDED_BY_USER_STOP.

import crypto from 'node:crypto';
import {
  type PolicyRing,
  type PolicyCandidatePackage,
  type PolicyRingAssignment,
  type PolicyCanaryFailureReason,
} from './policyCanaryTypes.js';
import type { PolicyConfiguration } from '../policyEvolution/policyEvolutionTypes.js';
import { CANONICAL_HARD_FORBIDDEN_ACTIONS } from '../policyEnforcement/policyEnforcementTypes.js';
import { FailClosedBaselineFallback, globalFailClosedBaselineFallback } from '../policyEnforcement/failClosedBaselineFallback.js';
import { resolveUserPartition, DEFAULT_PRIMARY_USER_ID } from '../persistence/userPartitionResolver.js';

export interface PolicyRoutingDecision {
  readonly tenantPartition: string;
  readonly ring: PolicyRing;
  readonly effectivePolicyConfig: PolicyConfiguration;
  readonly isCandidate: boolean;
  readonly candidatePackage?: PolicyCandidatePackage;
  readonly isBaselineFallback: boolean;
  readonly shadowCandidateConfig?: PolicyConfiguration;
  readonly reason: string;
  readonly failClosedReason?: PolicyCanaryFailureReason;
}

export interface PolicyRingRouterOptions {
  readonly fallbackProvider?: FailClosedBaselineFallback;
  readonly isUserStopActive?: () => boolean;
  readonly baseDir?: string;
}

export class PolicyRingRouter {
  private readonly fallbackProvider: FailClosedBaselineFallback;
  private readonly isUserStopActiveFn?: () => boolean;
  private readonly baseDir?: string;

  // In-memory cache keyed by tenantPartition
  private readonly assignments = new Map<string, PolicyRingAssignment>();
  // In-memory candidate registry keyed by candidateId
  private readonly candidates = new Map<string, PolicyCandidatePackage>();

  constructor(options?: PolicyRingRouterOptions) {
    this.fallbackProvider = options?.fallbackProvider ?? globalFailClosedBaselineFallback;
    this.isUserStopActiveFn = options?.isUserStopActive;
    this.baseDir = options?.baseDir;
  }

  /**
   * Registers a candidate package for routing.
   * Đăng ký một gói ứng viên để định tuyến.
   */
  public registerCandidate(candidate: PolicyCandidatePackage): void {
    if (!candidate || !candidate.candidateId) {
      throw new Error('INVALID_CANDIDATE: Candidate package must have a valid candidateId');
    }
    // Verify checksum integrity
    this.verifyCandidateChecksum(candidate);
    this.candidates.set(candidate.candidateId, candidate);
  }

  /**
   * Assigns a tenant partition to a specific candidate and ring.
   * Gán một phân vùng người thuê vào một ứng viên và vòng cụ thể.
   */
  public assignTenantRing(assignment: PolicyRingAssignment): void {
    if (!assignment.tenantPartition || assignment.tenantPartition === 'anonymous') {
      throw new Error('TENANT_ISOLATION_FAILURE: Anonymous or empty tenant cannot be assigned to canary ring');
    }
    const candidate = this.candidates.get(assignment.candidateId);
    if (!candidate) {
      throw new Error(`CANDIDATE_NOT_FOUND: Candidate '${assignment.candidateId}' is not registered`);
    }
    this.assignments.set(assignment.tenantPartition, assignment);
  }

  /**
   * Removes ring assignment for a tenant.
   * Xóa gán vòng cho một người thuê.
   */
  public unassignTenant(tenantPartition: string): boolean {
    return this.assignments.delete(tenantPartition);
  }

  /**
   * Clears all assignments and candidates (used during rollback or reset).
   * Xóa tất cả gán và ứng viên (sử dụng khi hoàn nguyên hoặc đặt lại).
   */
  public clearAll(): void {
    this.assignments.clear();
    this.candidates.clear();
  }

  /**
   * Resolves the ring assignment for a tenant.
   * Giải quyết gán vòng cho một người thuê.
   */
  public getRingAssignment(tenantPartition: string): PolicyRingAssignment | undefined {
    return this.assignments.get(tenantPartition);
  }

  /**
   * Resolves candidate package for a tenant.
   * Giải quyết gói ứng viên cho một người thuê.
   */
  public resolveCandidate(tenantPartition: string): PolicyCandidatePackage | undefined {
    const assignment = this.assignments.get(tenantPartition);
    if (!assignment || !assignment.active) return undefined;
    return this.candidates.get(assignment.candidateId);
  }

  /**
   * Resolves whether the candidate should be used for execution for a tenant.
   * Giải quyết xem ứng viên có nên được sử dụng để thực thi cho người thuê hay không.
   */
  public shouldUseCandidate(tenantPartition: string): boolean {
    const assignment = this.assignments.get(tenantPartition);
    if (!assignment || !assignment.active) return false;
    // Ring 0 is SHADOW -> Candidate NEVER executes!
    if (assignment.ring === 'RING_0') return false;
    // Rings 1 to 4 -> Candidate may execute if healthy and valid
    return true;
  }

  /**
   * Resolves the effective policy configuration to use for live execution.
   * Applies fail-closed invariants and routes candidate vs active policy.
   *
   * Giải quyết cấu hình chính sách hiệu lực để sử dụng cho thực thi trực tiếp.
   * Áp dụng các bất biến đóng an toàn và định tuyến chính sách ứng viên vs hoạt động.
   */
  public resolvePolicyForTenant(
    userId: string,
    activePolicyConfig: PolicyConfiguration,
    toolName?: string
  ): PolicyRoutingDecision {
    // 1. Enforce USER_STOP supremacy
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      const baseline = this.fallbackProvider.getBaselineConfiguration();
      return {
        tenantPartition: userId || 'unknown',
        ring: 'RING_0',
        effectivePolicyConfig: baseline,
        isCandidate: false,
        isBaselineFallback: true,
        reason: 'OPERATION_SUSPENDED_BY_USER_STOP',
        failClosedReason: 'USER_STOP',
      };
    }

    // 2. Enforce Tenant Isolation (Reject anonymous / malformed userId)
    if (!userId || userId === 'anonymous' || typeof userId !== 'string' || userId.trim().length === 0) {
      const baseline = this.fallbackProvider.getBaselineConfiguration();
      return {
        tenantPartition: 'anonymous',
        ring: 'RING_0',
        effectivePolicyConfig: baseline,
        isCandidate: false,
        isBaselineFallback: true,
        reason: 'ANONYMOUS_ACCESS_FORBIDDEN: Anonymous users cannot participate in canary routing',
        failClosedReason: 'TENANT_ISOLATION_FAILURE',
      };
    }

    let tenantPartition: string;
    try {
      tenantPartition = resolveUserPartition(userId, this.baseDir ?? process.cwd()).partitionKey;
    } catch {
      const baseline = this.fallbackProvider.getBaselineConfiguration();
      return {
        tenantPartition: userId,
        ring: 'RING_0',
        effectivePolicyConfig: baseline,
        isCandidate: false,
        isBaselineFallback: true,
        reason: 'TENANT_ISOLATION_FAILURE: Invalid tenant partition path',
        failClosedReason: 'TENANT_ISOLATION_FAILURE',
      };
    }

    // 3. Hard-Forbidden Action Invariant Check
    if (toolName && CANONICAL_HARD_FORBIDDEN_ACTIONS.includes(toolName)) {
      const baseline = this.fallbackProvider.getBaselineConfiguration();
      return {
        tenantPartition,
        ring: 'RING_0',
        effectivePolicyConfig: baseline,
        isCandidate: false,
        isBaselineFallback: false,
        reason: `HARD_FORBIDDEN_SAFETY_FLOOR: Tool '${toolName}' is permanently forbidden across all rings`,
      };
    }

    // 4. Check for active ring assignment
    const assignment = this.assignments.get(tenantPartition);
    if (!assignment || !assignment.active) {
      // Default to active policy baseline
      return {
        tenantPartition,
        ring: 'RING_0',
        effectivePolicyConfig: activePolicyConfig,
        isCandidate: false,
        isBaselineFallback: false,
        reason: 'DEFAULT_ROUTING: No active canary assignment found; using active baseline policy',
      };
    }

    // 5. Retrieve candidate package
    const candidate = this.candidates.get(assignment.candidateId);
    if (!candidate) {
      return {
        tenantPartition,
        ring: assignment.ring,
        effectivePolicyConfig: this.fallbackProvider.getBaselineConfiguration(),
        isCandidate: false,
        isBaselineFallback: true,
        reason: `CANDIDATE_MISSING: Assigned candidate '${assignment.candidateId}' not found`,
        failClosedReason: 'UNKNOWN_FAILURE',
      };
    }

    // 6. Check expiration
    if (new Date(candidate.expiresAt).getTime() < Date.now()) {
      return {
        tenantPartition,
        ring: assignment.ring,
        effectivePolicyConfig: this.fallbackProvider.getBaselineConfiguration(),
        isCandidate: false,
        isBaselineFallback: true,
        reason: `EXPIRED_POLICY: Candidate '${candidate.candidateId}' has expired`,
        failClosedReason: 'EXPIRED_POLICY',
      };
    }

    // 7. Verify Checksum
    try {
      this.verifyCandidateChecksum(candidate);
    } catch {
      return {
        tenantPartition,
        ring: assignment.ring,
        effectivePolicyConfig: this.fallbackProvider.getBaselineConfiguration(),
        isCandidate: false,
        isBaselineFallback: true,
        reason: `CHECKSUM_MISMATCH: Candidate '${candidate.candidateId}' failed cryptographic integrity check`,
        failClosedReason: 'CHECKSUM_MISMATCH',
      };
    }

    // 8. Verify hard-forbidden actions are not downgraded in candidate
    for (const forbidden of CANONICAL_HARD_FORBIDDEN_ACTIONS) {
      const candidateClass = candidate.policyConfig.actionClassifications[forbidden];
      if (candidateClass && candidateClass !== 'FORBIDDEN') {
        return {
          tenantPartition,
          ring: assignment.ring,
          effectivePolicyConfig: this.fallbackProvider.getBaselineConfiguration(),
          isCandidate: false,
          isBaselineFallback: true,
          reason: `HARD_FORBIDDEN_DOWNGRADE: Candidate illegally downgraded '${forbidden}' to '${candidateClass}'`,
          failClosedReason: 'HARD_FORBIDDEN_DOWNGRADE',
        };
      }
    }

    // 9. Route based on Ring
    switch (assignment.ring) {
      case 'RING_0':
        // SHADOW MODE: Active policy executes! Candidate is provided ONLY for shadow evaluation
        return {
          tenantPartition,
          ring: 'RING_0',
          effectivePolicyConfig: activePolicyConfig,
          isCandidate: false,
          candidatePackage: candidate,
          shadowCandidateConfig: candidate.policyConfig,
          isBaselineFallback: false,
          reason: 'RING_0_SHADOW: Active policy executes; candidate evaluated strictly in shadow mode',
        };

      case 'RING_1':
      case 'RING_2':
      case 'RING_3':
        // COHORT CANARY: Candidate executes for assigned tenant
        return {
          tenantPartition,
          ring: assignment.ring,
          effectivePolicyConfig: candidate.policyConfig,
          isCandidate: true,
          candidatePackage: candidate,
          isBaselineFallback: false,
          reason: `${assignment.ring}_COHORT: Candidate policy authorized and routed for execution`,
        };

      case 'RING_4':
        // GLOBAL ACTIVATION: Promoted candidate executes
        return {
          tenantPartition,
          ring: 'RING_4',
          effectivePolicyConfig: candidate.policyConfig,
          isCandidate: true,
          candidatePackage: candidate,
          isBaselineFallback: false,
          reason: 'RING_4_GLOBAL: Globally promoted candidate policy active',
        };

      default:
        return {
          tenantPartition,
          ring: 'RING_0',
          effectivePolicyConfig: this.fallbackProvider.getBaselineConfiguration(),
          isCandidate: false,
          isBaselineFallback: true,
          reason: `INVALID_RING: Unknown ring '${(assignment as any).ring}'`,
          failClosedReason: 'UNKNOWN_FAILURE',
        };
    }
  }

  /**
   * Cryptographically verifies candidate policy checksum.
   * Xác minh mã kiểm tra chính sách ứng viên theo mật mã học.
   */
  private verifyCandidateChecksum(candidate: PolicyCandidatePackage): void {
    const payload = JSON.stringify({
      versionId: candidate.policyConfig.versionId,
      classifications: candidate.policyConfig.actionClassifications,
      guardrails: candidate.policyConfig.guardrails,
    });
    const calculated = crypto.createHash('sha256').update(payload).digest('hex');
    if (candidate.checksum !== calculated || candidate.policyConfig.checksum !== calculated) {
      throw new Error(`CHECKSUM_MISMATCH: Calculated '${calculated}' does not match stored checksum`);
    }
  }
}

export const globalPolicyRingRouter = new PolicyRingRouter();
