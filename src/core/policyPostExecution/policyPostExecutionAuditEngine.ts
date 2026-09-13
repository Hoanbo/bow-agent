// src/core/policyPostExecution/policyPostExecutionAuditEngine.ts
// BOWCON V4.0 — MS-1.3.66: GOVERNED POST-EXECUTION RECONCILIATION,
// IMPACT ANALYSIS & POLICY FEEDBACK PROPOSAL LAYER
//
// Governed Post-Execution Audit Engine.
// Records post-execution reconciliation, impact, regression, and feedback proposal events
// into the append-only AuditLedger under the POLICY_POST_EXECUTION domain.
// Deeply sanitizes all payloads using DiagnosisSanitizer.
//
// Động cơ kiểm toán sau thực thi có quản trị.
// Ghi lại các sự kiện điều hòa, tác động, hồi quy và đề xuất phản hồi sau thực thi
// vào AuditLedger chỉ ghi thêm dưới miền POLICY_POST_EXECUTION.
// Làm sạch sâu tất cả các gói dữ liệu bằng DiagnosisSanitizer.
//
// Authority Invariants:
// - CANONICAL_DOMAIN: POLICY_POST_EXECUTION
// - ZERO_SECRET_LEAKAGE: All credentials, keys, and tokens deeply redacted
// - REUSES_GLOBAL_AUDIT_LEDGER: Zero parallel ledgers

import crypto from 'node:crypto';
import { AuditLedger, globalAuditLedger } from '../auditLedger.js';
import { DiagnosisSanitizer, globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';

export type PolicyPostExecutionAuditEventType =
  | 'POST_EXECUTION_RECONCILED'
  | 'IMPACT_ANALYZED'
  | 'REGRESSION_DETECTED'
  | 'EFFECTIVENESS_ASSESSED'
  | 'FEEDBACK_PROPOSED'
  | 'FEEDBACK_BLOCKED'
  | 'USER_STOP_BLOCKED'
  | 'TENANT_ISOLATION_BLOCKED'
  | 'INTEGRITY_FAILURE';

export interface PolicyPostExecutionAuditRecord {
  readonly eventType: PolicyPostExecutionAuditEventType;
  readonly tenantPartition: string;
  readonly executionId?: string;
  readonly proposalId?: string;
  readonly status?: string;
  readonly reason?: string;
  readonly details?: Record<string, any>;
}

export interface PolicyPostExecutionAuditEngineOptions {
  readonly auditLedger?: AuditLedger;
  readonly sanitizer?: DiagnosisSanitizer;
}

export class PolicyPostExecutionAuditEngine {
  public static readonly CANONICAL_DOMAIN = 'POLICY_POST_EXECUTION';

  private readonly auditLedger: AuditLedger;
  private readonly sanitizer: DiagnosisSanitizer;

  constructor(options?: PolicyPostExecutionAuditEngineOptions) {
    this.auditLedger = options?.auditLedger ?? globalAuditLedger;
    this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
  }

  /**
   * Records a sanitized post-execution audit event into the append-only ledger.
   * Ghi lại một sự kiện kiểm toán sau thực thi đã được làm sạch vào sổ cái chỉ ghi thêm.
   */
  public recordEvent(record: PolicyPostExecutionAuditRecord): void {
    const timestamp = new Date().toISOString();

    const rawPayload = {
      executionId: record.executionId,
      proposalId: record.proposalId,
      status: record.status,
      reason: record.reason,
      details: record.details,
    };

    const sanitizedPayload = this.sanitizer.sanitize(rawPayload);
    const argumentsHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(sanitizedPayload))
      .digest('hex');

    this.auditLedger.record({
      timestamp,
      actor: {
        userId: 'system_post_execution_governance',
        role: 'governance_reconciliation',
        channel: 'policy_feedback_boundary',
      },
      domain: PolicyPostExecutionAuditEngine.CANONICAL_DOMAIN as any,
      toolName: `policy_post_execution_${record.eventType.toLowerCase()}`,
      classification: 'HIGH_IMPACT',
      policyDecision: record.eventType.includes('BLOCKED') || record.eventType.includes('FAILURE') ? 'DENY' : 'PERMIT',
      executionStatus: record.eventType.includes('BLOCKED') || record.eventType.includes('FAILURE')
        ? 'BLOCKED'
        : 'SUCCESS',
      argumentsHash,
      approvalId: record.proposalId,
    });
  }
}

export const globalPolicyPostExecutionAuditEngine = new PolicyPostExecutionAuditEngine();
