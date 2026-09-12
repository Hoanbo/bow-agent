// src/core/policyEnforcement/governedPolicyEnforcementPoint.ts
// BOWCON V4.0 — MS-1.3.59: GOVERNED RUNTIME POLICY ENFORCEMENT POINT (PEP),
// DYNAMIC PDP SYNCHRONIZATION & LIVE GUARDRAIL EXECUTION PIPELINE
//
// Central Governed Policy Enforcement Point (PEP).
// Sits directly before live tool execution in ToolRegistry / AgentLoop.
// Enforces:
// 1. Absolute USER_STOP supremacy
// 2. Strict tenant partition isolation
// 3. Dynamic active policy resolution
// 4. Immutable hard-forbidden safety floor (transfer_funds, delete_database, etc.)
// 5. Precedence: HARD-CODED SAFETY FLOOR > ACTIVE AUTHORIZED POLICY > DEFAULT POLICY
// 6. Calibrated runtime guardrail enforcement (minApprovalTimeoutMs, maxRetries, concurrency, leases)
// 7. Authoritative Human Gate delegation (Zero autonomous token issuance, Zero self-approval)
//
// Điểm thực thi chính sách có quản trị trung tâm (PEP).
// Nằm ngay trước khi thực thi công cụ trực tiếp trong ToolRegistry / AgentLoop.
//
// Authority Invariants:
// - Level 2 Controlled Runtime Enforcement
// - ZERO_AUTONOMOUS_TOKEN_ISSUANCE
// - ZERO_AUTONOMOUS_SELF_APPROVAL
// - ZERO_FORBIDDEN_ACTION_EROSION
// - ABSOLUTE_USER_STOP_SUPREMACY
// - FAIL_CLOSED_ON_POLICY_TAMPERING

import path from 'node:path';
import {
  type ActionClassification,
  type PolicyDecision,
  PolicyDecisionPoint,
  globalPDP,
} from '../policyDecisionPoint.js';
import {
  type EnforcementContext,
  type EnforcementDecision,
  createEnforcementDecisionId,
  CANONICAL_HARD_FORBIDDEN_ACTIONS,
  type ExecutionLeaseId,
} from './policyEnforcementTypes.js';
import { PolicyHotSwapEngine, globalPolicyHotSwapEngine } from './policyHotSwapEngine.js';
import { ActivePolicyResolver, globalActivePolicyResolver } from './activePolicyResolver.js';
import { RuntimeGuardrailEnforcer, globalRuntimeGuardrailEnforcer } from './runtimeGuardrailEnforcer.js';
import { PolicyViolationAuditor, globalPolicyViolationAuditor } from './policyViolationAuditor.js';
import { FailClosedBaselineFallback, globalFailClosedBaselineFallback } from './failClosedBaselineFallback.js';
import { resolveUserPartition, DEFAULT_PRIMARY_USER_ID } from '../persistence/userPartitionResolver.js';
import { PolicyCanaryRuntime, globalPolicyCanaryRuntime } from '../policyCanary/policyCanaryRuntime.js';

export interface GovernedPEPOptions {
  readonly pdp?: PolicyDecisionPoint;
  readonly hotSwapEngine?: PolicyHotSwapEngine;
  readonly activeResolver?: ActivePolicyResolver;
  readonly guardrailEnforcer?: RuntimeGuardrailEnforcer;
  readonly auditor?: PolicyViolationAuditor;
  readonly fallbackProvider?: FailClosedBaselineFallback;
  readonly baseDir?: string;
  readonly isUserStopActive?: () => boolean;
  readonly canaryRuntime?: PolicyCanaryRuntime;
}

export class GovernedPolicyEnforcementPoint {
  private readonly pdp: PolicyDecisionPoint;
  private readonly hotSwapEngine: PolicyHotSwapEngine;
  private readonly activeResolver: ActivePolicyResolver;
  private readonly guardrailEnforcer: RuntimeGuardrailEnforcer;
  private readonly auditor: PolicyViolationAuditor;
  private readonly fallbackProvider: FailClosedBaselineFallback;
  private readonly baseDir: string;
  private readonly isUserStopActiveFn?: () => boolean;
  private readonly canaryRuntime?: PolicyCanaryRuntime;

  constructor(options?: GovernedPEPOptions) {
    this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'policy-evolution'));
    this.pdp = options?.pdp ?? globalPDP;
    this.hotSwapEngine = options?.hotSwapEngine ?? globalPolicyHotSwapEngine;
    this.activeResolver = options?.activeResolver ?? globalActivePolicyResolver;
    this.guardrailEnforcer = options?.guardrailEnforcer ?? globalRuntimeGuardrailEnforcer;
    this.auditor = options?.auditor ?? globalPolicyViolationAuditor;
    this.fallbackProvider = options?.fallbackProvider ?? globalFailClosedBaselineFallback;
    this.isUserStopActiveFn = options?.isUserStopActive;
    this.canaryRuntime = options?.canaryRuntime ?? globalPolicyCanaryRuntime;
  }

  /**
   * Primary enforcement entrypoint evaluating and enforcing policies prior to tool execution.
   * Điểm vào thực thi chính đánh giá và thực thi chính sách trước khi thực thi công cụ.
   */
  public enforce(context: EnforcementContext): EnforcementDecision {
    const decisionTimestamp = new Date().toISOString();
    const decisionId = createEnforcementDecisionId(
      `pep_dec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    );

    // 1. Enforce absolute USER_STOP supremacy
    const userStopActive =
      (this.isUserStopActiveFn && this.isUserStopActiveFn()) ||
      this.pdp.isEmergencyStopped();

    if (userStopActive) {
      this.auditor.recordViolation({
        tenantPartition: context.tenantPartition || context.actor.userId || 'unknown',
        eventType: 'USER_STOP_HALT',
        toolName: context.toolName,
        reason: 'Execution blocked: Emergency USER_STOP is active.',
      });

      return {
        decisionId,
        allowed: false,
        classification: 'FORBIDDEN',
        requiresApproval: false,
        policyVersion: 'LOCKED_BY_USER_STOP',
        policyChecksum: 'IMMUTABLE_USER_STOP',
        isBaselineFallback: true,
        reason: 'OPERATION_SUSPENDED_BY_USER_STOP',
        decisionTimestamp,
        failClosedReason: 'USER_STOP_ACTIVE',
      };
    }

    // 2. Tenant Partition Resolution
    const effectiveUserId = context.actor?.userId || context.tenantPartition;
    if (!effectiveUserId || effectiveUserId === 'anonymous') {
      return this.fallbackProvider.createFailClosedDecision({
        toolName: context.toolName,
        reason: 'Anonymous access rejected by governed runtime PEP.',
        failClosedReason: 'ANONYMOUS_ACCESS_FORBIDDEN',
      });
    }

    let tenantPartition: string;
    try {
      tenantPartition = resolveUserPartition(effectiveUserId, this.baseDir).partitionKey;
    } catch (err: any) {
      return this.fallbackProvider.createFailClosedDecision({
        toolName: context.toolName,
        reason: `Tenant partition resolution failed: ${err?.message}`,
        failClosedReason: 'POLICY_TENANT_MISMATCH',
      });
    }

    // 3. Resolve active policy reference for the tenant
    const activeRef = this.hotSwapEngine.getActivePolicy(tenantPartition);
    let activeConfig = activeRef.policyConfig;

    // Evaluate policy canary routing (Ring 0 to Ring 4)
    if (this.canaryRuntime) {
      const canaryRoute = this.canaryRuntime.evaluateExecutionRoute(
        tenantPartition,
        activeConfig,
        context.toolName
      );

      if (canaryRoute.isBaselineFallback && canaryRoute.failClosedReason) {
        return this.fallbackProvider.createFailClosedDecision({
          toolName: context.toolName,
          reason: canaryRoute.reason,
          failClosedReason: canaryRoute.failClosedReason as any,
        });
      }

      // Ring 0: Shadow Mode
      if (canaryRoute.ring === 'RING_0' && canaryRoute.shadowCandidateConfig && canaryRoute.candidatePackage) {
        // Active policy executes; Candidate shadow evaluated with ZERO side effects
        // Fault Isolation: Shadow evaluator failure must NEVER crash or disrupt active tool execution
        try {
          this.canaryRuntime.executeShadowEvaluation(
            {
              tenantPartition,
              toolName: context.toolName,
              args: context.args,
              activeConfig,
              candidateConfig: canaryRoute.shadowCandidateConfig,
              correlationId: context.correlationId,
              actorRole: context.actor?.role,
              requestedApprovalTimeoutMs: context.requestedApprovalTimeoutMs,
              retryAttempt: context.retryAttempt,
            },
            canaryRoute.candidatePackage.candidateId
          );
        } catch (shadowErr: any) {
          this.auditor.recordViolation({
            tenantPartition,
            eventType: 'INTEGRITY_FAILURE',
            toolName: context.toolName,
            policyVersion: canaryRoute.candidatePackage.policyConfig.versionId,
            reason: `Shadow evaluation failed safely isolated: ${shadowErr?.message}`,
          });
        }
      } else if (canaryRoute.isCandidate && canaryRoute.effectivePolicyConfig) {
        // Rings 1–3 or Ring 4: Candidate policy selected for enforcement
        activeConfig = canaryRoute.effectivePolicyConfig;
      }
    }

    // 4. Hard-Forbidden Immutability Check
    const isPermanentlyForbidden = CANONICAL_HARD_FORBIDDEN_ACTIONS.includes(context.toolName);
    if (isPermanentlyForbidden) {
      const declaredClassification = activeConfig.actionClassifications[context.toolName];
      if (declaredClassification && declaredClassification !== 'FORBIDDEN') {
        this.auditor.recordViolation({
          tenantPartition,
          eventType: 'FORBIDDEN_DOWNGRADE_ATTEMPT',
          toolName: context.toolName,
          policyVersion: activeConfig.versionId,
          reason: `Policy attempted illegal downgrade of '${context.toolName}' to '${declaredClassification}'.`,
        });

        // Trigger immediate reset to baseline
        this.hotSwapEngine.resetToBaseline(tenantPartition, 'FORBIDDEN_DOWNGRADE_ATTEMPT');

        return this.fallbackProvider.createFailClosedDecision({
          toolName: context.toolName,
          reason: `Security Invariant Violated: Hard-forbidden action '${context.toolName}' cannot be reclassified.`,
          failClosedReason: 'FORBIDDEN_DOWNGRADE_ATTEMPT',
          policyVersion: activeConfig.versionId,
        });
      }

      // Hard-forbidden actions are unconditionally rejected
      return {
        decisionId,
        allowed: false,
        classification: 'FORBIDDEN',
        requiresApproval: false,
        policyVersion: activeConfig.versionId,
        policyChecksum: activeConfig.checksum,
        isBaselineFallback: activeRef.isFallback,
        reason: `Action '${context.toolName}' is permanently FORBIDDEN by canonical safety floor.`,
        decisionTimestamp,
        failClosedReason: 'FORBIDDEN_DOWNGRADE_ATTEMPT',
      };
    }

    // 5. Precedence: HARD-CODED SAFETY FLOOR > ACTIVE AUTHORIZED POLICY > DEFAULT POLICY
    let resolvedClassification: ActionClassification;
    if (activeConfig.actionClassifications[context.toolName]) {
      resolvedClassification = activeConfig.actionClassifications[context.toolName];
    } else {
      resolvedClassification = this.pdp.getActionClassification(context.toolName);
    }

    // 6. Runtime Guardrail Evaluation
    const guardrailResult = this.guardrailEnforcer.evaluateGuardrails({
      tenantPartition,
      toolName: context.toolName,
      guardrails: activeConfig.guardrails,
      correlationId: context.correlationId,
      requestedApprovalTimeoutMs: context.requestedApprovalTimeoutMs,
      retryAttempt: context.retryAttempt,
    });

    if (!guardrailResult.passed) {
      this.auditor.recordViolation({
        tenantPartition,
        eventType: 'GUARDRAIL_REJECTION',
        toolName: context.toolName,
        policyVersion: activeConfig.versionId,
        reason: guardrailResult.reason || 'Guardrail thresholds exceeded.',
        details: { violations: guardrailResult.violations },
      });

      return {
        decisionId,
        allowed: false,
        classification: resolvedClassification,
        requiresApproval: resolvedClassification === 'HIGH_IMPACT',
        policyVersion: activeConfig.versionId,
        policyChecksum: activeConfig.checksum,
        isBaselineFallback: activeRef.isFallback,
        reason: `GUARDRAIL_BLOCKED: ${guardrailResult.reason}`,
        decisionTimestamp,
        failClosedReason: guardrailResult.failClosedReason || 'GUARDRAIL_VIOLATION',
      };
    }

    // 7. Authorization & Supervisor Gates Enforcement
    if (resolvedClassification === 'OBSERVE' || resolvedClassification === 'RECOMMEND') {
      const leaseId = this.guardrailEnforcer.acquireExecutionLease({
        tenantPartition,
        toolName: context.toolName,
        correlationId: context.correlationId,
      });

      return {
        decisionId,
        allowed: true,
        classification: resolvedClassification,
        requiresApproval: false,
        policyVersion: activeConfig.versionId,
        policyChecksum: activeConfig.checksum,
        isBaselineFallback: activeRef.isFallback,
        reason: `Execution permitted under ${resolvedClassification} dynamic policy.`,
        leaseId,
        decisionTimestamp,
      };
    }

    if (resolvedClassification === 'REVERSIBLE') {
      const isOwner = context.actor.role === 'owner' || context.actor.isOwner === true;
      if (!isOwner && context.actor.role !== 'admin' && context.actor.role !== 'desktop_agent') {
        return {
          decisionId,
          allowed: false,
          classification: 'REVERSIBLE',
          requiresApproval: false,
          policyVersion: activeConfig.versionId,
          policyChecksum: activeConfig.checksum,
          isBaselineFallback: activeRef.isFallback,
          reason: 'FORBIDDEN_ACCESS: Reversible action requires owner/admin authorization.',
          decisionTimestamp,
        };
      }

      const leaseId = this.guardrailEnforcer.acquireExecutionLease({
        tenantPartition,
        toolName: context.toolName,
        correlationId: context.correlationId,
      });

      return {
        decisionId,
        allowed: true,
        classification: 'REVERSIBLE',
        requiresApproval: false,
        policyVersion: activeConfig.versionId,
        policyChecksum: activeConfig.checksum,
        isBaselineFallback: activeRef.isFallback,
        reason: 'Reversible side-effect authorized for owner/authorized channel.',
        leaseId,
        decisionTimestamp,
      };
    }

    // HIGH_IMPACT: Strictly delegate to ApprovalService — NEVER issue tokens autonomously
    if (resolvedClassification === 'HIGH_IMPACT') {
      const approvalService = this.pdp.getApprovalService();

      if (context.executionToken) {
        const tokenValidation = approvalService.validateAndConsumeToken(
          context.executionToken,
          context.toolName,
          context.args,
          context.actor?.userId
        );

        if (tokenValidation.valid) {
          const leaseId = this.guardrailEnforcer.acquireExecutionLease({
            tenantPartition,
            toolName: context.toolName,
            correlationId: context.correlationId,
          });

          return {
            decisionId,
            allowed: true,
            classification: 'HIGH_IMPACT',
            requiresApproval: false,
            policyVersion: activeConfig.versionId,
            policyChecksum: activeConfig.checksum,
            isBaselineFallback: activeRef.isFallback,
            approvalId: tokenValidation.record?.id,
            reason: 'High-impact execution token validated and consumed.',
            leaseId,
            decisionTimestamp,
          };
        }

        return {
          decisionId,
          allowed: false,
          classification: 'HIGH_IMPACT',
          requiresApproval: true,
          policyVersion: activeConfig.versionId,
          policyChecksum: activeConfig.checksum,
          isBaselineFallback: activeRef.isFallback,
          reason: `INVALID_APPROVAL_TOKEN: ${tokenValidation.reason}`,
          decisionTimestamp,
        };
      }

      // No token provided -> request approval from human gate
      const approvalRecord = approvalService.requestApproval({
        actionName: context.toolName,
        targetDomain: this.pdp.resolveDomain(context.toolName),
        arguments: context.args,
        requestedBy: context.actor?.userId || 'agent_autonomous',
        userId: context.actor?.userId,
      });

      return {
        decisionId,
        allowed: false,
        classification: 'HIGH_IMPACT',
        requiresApproval: true,
        policyVersion: activeConfig.versionId,
        policyChecksum: activeConfig.checksum,
        isBaselineFallback: activeRef.isFallback,
        approvalId: approvalRecord.id,
        reason: `HIGH_IMPACT_APPROVAL_REQUIRED: Action requires explicit confirmation. Approval ID: ${approvalRecord.id}`,
        decisionTimestamp,
      };
    }

    // Default Deny
    return {
      decisionId,
      allowed: false,
      classification: 'HIGH_IMPACT',
      requiresApproval: true,
      policyVersion: activeConfig.versionId,
      policyChecksum: activeConfig.checksum,
      isBaselineFallback: true,
      reason: 'DEFAULT_DENY: No policy rule permits this execution.',
      decisionTimestamp,
    };
  }

  /**
   * Releases an execution lease after tool execution completes or fails.
   * Giải phóng hợp đồng thuê thực thi sau khi hoàn tất hoặc thất bại.
   */
  public releaseLease(leaseId?: ExecutionLeaseId): boolean {
    if (!leaseId) return false;
    return this.guardrailEnforcer.releaseExecutionLease(leaseId);
  }

  /**
   * Helper returning the active policy classification for a tool.
   * Hàm trợ giúp trả về phân loại chính sách hoạt động cho công cụ.
   */
  public getActiveActionClassification(toolName: string, tenantPartition?: string): ActionClassification {
    if (CANONICAL_HARD_FORBIDDEN_ACTIONS.includes(toolName)) {
      return 'FORBIDDEN';
    }
    const partition = tenantPartition || DEFAULT_PRIMARY_USER_ID;
    const activeRef = this.hotSwapEngine.getActivePolicy(partition);
    let effectiveConfig = activeRef.policyConfig;
    if (this.canaryRuntime) {
      const route = this.canaryRuntime.evaluateExecutionRoute(partition, effectiveConfig, toolName);
      if (route.isCandidate && route.effectivePolicyConfig) {
        effectiveConfig = route.effectivePolicyConfig;
      }
    }
    return effectiveConfig.actionClassifications[toolName] || this.pdp.getActionClassification(toolName);
  }
}

export const globalGovernedPEP = new GovernedPolicyEnforcementPoint();
