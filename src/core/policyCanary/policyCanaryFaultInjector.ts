// src/core/policyCanary/policyCanaryFaultInjector.ts
// BOWCON V4.0 — MS-1.3.61: GOVERNED POLICY CANARY RESILIENCE, FAULT INJECTION & FAILURE-RECOVERY VERIFICATION
//
// Governed Policy Canary Fault Injector.
// Provides controlled, armable synthetic fault injection to verify resilience, fail-closed recovery,
// and safety boundary containment across all canary lifecycle stages (Ring 0 to Ring 4).
//
// Bộ tiêm lỗi Canary chính sách có quản trị.
// Cung cấp khả năng tiêm lỗi tổng hợp có kiểm soát, có thể kích hoạt để kiểm chứng khả năng phục hồi,
// khôi phục đóng an toàn và giới hạn an toàn qua tất cả các giai đoạn vòng đời canary (Vòng 0 đến Vòng 4).
//
// Authority Invariants:
// - Level 0 Read-Only Fault Simulation & Inspection
// - ZERO_AUTONOMOUS_TOKEN_ISSUANCE: Never calls issueToken() or produces tokens.
// - ZERO_AUTONOMOUS_APPROVAL: Never calls grantApproval() or bypasses human review.
// - HARD_FORBIDDEN_IMMUTABILITY: Injected faults CANNOT downgrade hard-forbidden actions.
// - USER_STOP > ALL_FAULT_INJECTION: Fault injection halts immediately under USER_STOP.
// - AUDIT_LOGGED: All armed/triggered faults emit structured sanitized audit events.

import crypto from 'node:crypto';
import {
  type PolicyCanaryFaultType,
  type FaultInjectionRule,
  type PolicyFaultInjectionId,
  createPolicyFaultInjectionId,
} from './policyCanaryResilienceTypes.js';
import type { PolicyRing } from './policyCanaryTypes.js';
import { globalAuditLedger } from '../auditLedger.js';
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';

export interface FaultEvaluationContext {
  readonly tenantPartition?: string;
  readonly candidateId?: string;
  readonly toolName?: string;
  readonly targetRing?: PolicyRing;
}

export class PolicyCanaryFaultInjector {
  private readonly rules = new Map<string, FaultInjectionRule>();
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(options?: { readonly isUserStopActive?: () => boolean }) {
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  /**
   * Arms a new fault injection rule.
   * Kích hoạt một quy tắc tiêm lỗi mới.
   */
  public armFault(
    params: Omit<FaultInjectionRule, 'id'>
  ): PolicyFaultInjectionId {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Cannot arm fault injector during emergency stop.');
    }

    const id = createPolicyFaultInjectionId(
      `flt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    );

    const rule: FaultInjectionRule = {
      id,
      faultType: params.faultType,
      tenantPartition: params.tenantPartition,
      candidateId: params.candidateId,
      toolName: params.toolName,
      targetRing: params.targetRing,
      active: params.active ?? true,
      triggerOnce: params.triggerOnce ?? false,
      errorMessage: params.errorMessage,
    };

    this.rules.set(id, rule);

    globalAuditLedger.record({
      timestamp: new Date().toISOString(),
      actor: { userId: 'system', role: 'supervisor', channel: 'internal' },
      domain: 'shop',
      toolName: 'policy_canary_fault_armed',
      classification: 'HIGH_IMPACT',
      policyDecision: 'PERMIT',
      executionStatus: 'SUCCESS',
      argumentsHash: crypto
        .createHash('sha256')
        .update(globalDiagnosisSanitizer.sanitizeString(JSON.stringify(rule)))
        .digest('hex'),
    });

    return id;
  }

  /**
   * Disarms an active fault injection rule by ID.
   * Vô hiệu hóa một quy tắc tiêm lỗi đang hoạt động theo ID.
   */
  public disarmFault(id: PolicyFaultInjectionId): boolean {
    const existed = this.rules.delete(id);
    if (existed) {
      globalAuditLedger.record({
        timestamp: new Date().toISOString(),
        actor: { userId: 'system', role: 'supervisor', channel: 'internal' },
        domain: 'shop',
        toolName: 'policy_canary_fault_disarmed',
        classification: 'ROUTINE',
        policyDecision: 'PERMIT',
        executionStatus: 'SUCCESS',
        argumentsHash: id,
      });
    }
    return existed;
  }

  /**
   * Disarms all active fault injection rules.
   * Vô hiệu hóa tất cả các quy tắc tiêm lỗi đang hoạt động.
   */
  public disarmAll(): void {
    this.rules.clear();
  }

  /**
   * Checks whether a specific fault should be injected given the context.
   * Kiểm tra xem một lỗi cụ thể có nên được tiêm trong ngữ cảnh hiện tại hay không.
   */
  public shouldInject(
    faultType: PolicyCanaryFaultType,
    context?: FaultEvaluationContext
  ): boolean {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      return false; // Fault injection halts under USER_STOP
    }

    for (const [id, rule] of this.rules.entries()) {
      if (!rule.active) continue;
      if (rule.faultType !== faultType) continue;

      if (rule.tenantPartition && context?.tenantPartition && rule.tenantPartition !== context.tenantPartition) {
        continue;
      }
      if (rule.candidateId && context?.candidateId && rule.candidateId !== context.candidateId) {
        continue;
      }
      if (rule.toolName && context?.toolName && rule.toolName !== context.toolName) {
        continue;
      }
      if (rule.targetRing && context?.targetRing && rule.targetRing !== context.targetRing) {
        continue;
      }

      if (rule.triggerOnce) {
        this.rules.delete(id);
      }
      return true;
    }

    return false;
  }

  /**
   * Injects the fault by throwing an Error if an active matching rule exists.
   * Tiêm lỗi bằng cách ném ra Error nếu tồn tại quy tắc khớp đang kích hoạt.
   */
  public triggerIfArmed(
    faultType: PolicyCanaryFaultType,
    context?: FaultEvaluationContext
  ): void {
    if (this.shouldInject(faultType, context)) {
      const msg = `SYNTHETIC_FAULT_INJECTED: Fault '${faultType}' triggered by PolicyCanaryFaultInjector`;
      globalAuditLedger.record({
        timestamp: new Date().toISOString(),
        actor: { userId: 'system', role: 'supervisor', channel: 'internal' },
        domain: 'shop',
        toolName: 'policy_canary_fault_triggered',
        classification: 'HIGH_IMPACT',
        policyDecision: 'PERMIT',
        executionStatus: 'FAILURE',
        argumentsHash: crypto
        .createHash('sha256')
        .update(globalDiagnosisSanitizer.sanitizeString(JSON.stringify({ faultType, context })))
        .digest('hex'),
      });
      throw new Error(msg);
    }
  }

  /**
   * Returns all currently active rules.
   * Trả về tất cả các quy tắc hiện đang kích hoạt.
   */
  public getActiveRules(): readonly FaultInjectionRule[] {
    return Array.from(this.rules.values());
  }
}

export const globalPolicyCanaryFaultInjector = new PolicyCanaryFaultInjector();
