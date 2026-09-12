// src/core/policyDecision/policyDecisionAuditEngine.ts
// BOWCON V4.0 — MS-1.3.64: GOVERNED POLICY DECISION & CONTROLLED REMEDIATION LAYER
//
// Governed Policy Decision Audit Engine (Component 734).
// Authoritatively logs all decision proposals, reviews, human authorizations,
// remediation plans, and boundary dispatches into the canonical AuditLedger.
// Deeply sanitizes sensitive credentials and secrets via DiagnosisSanitizer.
//
// Động cơ kiểm toán quyết định chính sách có quản trị (Thành phần 734).
// Ghi nhật ký có thẩm quyền tất cả các đề xuất quyết định, xem xét, ủy quyền của con người,
// kế hoạch khắc phục và điều phối ranh giới vào AuditLedger chuẩn tắc.
// Làm sạch sâu thông tin đăng nhập và bí mật nhạy cảm qua DiagnosisSanitizer.
//
// Authority Invariants:
// - Level 0 Read-Only Audit Logging
// - Canonical Domain: POLICY_DECISION
// - ZERO_SECRET_LEAKAGE: Redact all potential credentials and raw tokens
// - Reuses globalAuditLedger (Zero parallel ledgers)

import crypto from 'node:crypto';
import { AuditLedger, globalAuditLedger, type AuditEvent } from '../auditLedger.js';
import { DiagnosisSanitizer, globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';

export interface PolicyDecisionAuditEngineOptions {
  readonly auditLedger?: AuditLedger;
  readonly sanitizer?: DiagnosisSanitizer;
}

export class PolicyDecisionAuditEngine {
  public static readonly CANONICAL_DOMAIN = 'POLICY_DECISION';

  private readonly auditLedger: AuditLedger;
  private readonly sanitizer: DiagnosisSanitizer;

  constructor(options?: PolicyDecisionAuditEngineOptions) {
    this.auditLedger = options?.auditLedger ?? globalAuditLedger;
    this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
  }

  /**
   * Records a sanitized audit event for the policy decision and remediation layer.
   * Ghi lại sự kiện kiểm toán đã được làm sạch cho lớp quyết định và khắc phục chính sách.
   */
  public recordAuditEvent(input: {
    readonly eventType: string;
    readonly tenantPartition: string;
    readonly proposalId?: string;
    readonly requestId?: string;
    readonly decisionId?: string;
    readonly candidateId?: string;
    readonly operatorUserId?: string;
    readonly policyDecision: 'PERMIT' | 'DENY';
    readonly executionStatus: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
    readonly details?: Record<string, any>;
  }): AuditEvent {
    const timestamp = new Date().toISOString();
    const sanitizedDetails = input.details ? (this.sanitizer.sanitize(input.details) as Record<string, any>) : {};

    const operatorUser = input.operatorUserId
      ? this.sanitizer.sanitizeString(input.operatorUserId)
      : 'system_governed';

    const rawPayload = JSON.stringify({
      eventType: input.eventType,
      tenantPartition: input.tenantPartition,
      proposalId: input.proposalId,
      requestId: input.requestId,
      decisionId: input.decisionId,
      candidateId: input.candidateId,
      sanitizedDetails,
    });

    const argumentsHash = crypto.createHash('sha256').update(rawPayload).digest('hex');

    return this.auditLedger.record({
      timestamp,
      actor: {
        userId: operatorUser,
        role: 'operator',
        channel: 'governed_policy_decision',
      },
      domain: PolicyDecisionAuditEngine.CANONICAL_DOMAIN,
      toolName: this.sanitizer.sanitizeString(input.eventType),
      classification: input.policyDecision === 'PERMIT' ? 'STANDARD' : 'HIGH_IMPACT',
      argumentsHash,
      idempotencyKey: input.proposalId ?? input.requestId ?? input.decisionId,
      policyDecision: input.policyDecision,
      approvalId: input.proposalId,
      executionStatus: input.executionStatus,
    });
  }
}

export const globalPolicyDecisionAuditEngine = new PolicyDecisionAuditEngine();
