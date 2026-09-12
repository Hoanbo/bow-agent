// src/core/policyEnforcement/policyViolationAuditor.ts
// BOWCON V4.0 — MS-1.3.59: GOVERNED RUNTIME POLICY ENFORCEMENT POINT (PEP),
// DYNAMIC PDP SYNCHRONIZATION & LIVE GUARDRAIL EXECUTION PIPELINE
//
// Authoritative policy violation and enforcement auditor.
// Records structured enforcement decisions, guardrail violations, drift alerts,
// and fail-closed events directly into the canonical AuditLedger.
// Integrates DiagnosisSanitizer to guarantee zero credentials, secrets, or raw tokens leak into logs.
// Kiểm toán viên vi phạm và thực thi chính sách có thẩm quyền.
// Ghi lại các quyết định thực thi có cấu trúc, vi phạm rào chắn, cảnh báo độ lệch,
// và các sự kiện đóng an toàn trực tiếp vào AuditLedger chuẩn tắc.
// Tích hợp DiagnosisSanitizer để đảm bảo không có thông tin xác thực, bí mật hoặc token thô nào bị rò rỉ vào nhật ký.
//
// Authority Invariants:
// - Level 0 Read-Only Audit Logging
// - Canonical Domain: POLICY_ENFORCEMENT
// - Reuses existing globalAuditLedger (Zero parallel ledgers)
// - Zero autonomous token issuance, zero self-approval.

import crypto from 'node:crypto';
import { AuditLedger, globalAuditLedger, type AuditEvent } from '../auditLedger.js';
import { DiagnosisSanitizer, globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import {
  type PolicyViolationEvent,
  type ViolationAuditId,
  createViolationAuditId,
} from './policyEnforcementTypes.js';

export interface PolicyViolationAuditorOptions {
  readonly auditLedger?: AuditLedger;
  readonly sanitizer?: DiagnosisSanitizer;
}

export class PolicyViolationAuditor {
  public static readonly CANONICAL_DOMAIN = 'POLICY_ENFORCEMENT';

  private readonly auditLedger: AuditLedger;
  private readonly sanitizer: DiagnosisSanitizer;

  constructor(options?: PolicyViolationAuditorOptions) {
    this.auditLedger = options?.auditLedger ?? globalAuditLedger;
    this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
  }

  /**
   * Records a sanitized policy enforcement audit event.
   * Ghi lại sự kiện kiểm toán thực thi chính sách đã được làm sạch.
   */
  public recordViolation(event: Omit<PolicyViolationEvent, 'auditId' | 'timestamp'>): ViolationAuditId {
    const auditId = createViolationAuditId(`audit_pep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
    const timestamp = new Date().toISOString();

    const sanitizedDetails = event.details
      ? (this.sanitizer.sanitize(event.details) as Record<string, any>)
      : {};

    const argumentsHash = crypto
      .createHash('sha256')
      .update(JSON.stringify({ auditId, eventType: event.eventType, sanitizedDetails }))
      .digest('hex');

    const auditPayload: Omit<AuditEvent, 'eventId' | 'previousHash' | 'signature'> = {
      timestamp,
      actor: {
        userId: event.tenantPartition,
        role: 'pep_enforcer',
        channel: 'governed_runtime',
      },
      domain: PolicyViolationAuditor.CANONICAL_DOMAIN,
      toolName: event.toolName || 'governed_policy_enforcement',
      classification:
        event.eventType === 'POLICY_RESOLVED' || event.eventType === 'POLICY_ACTIVATED'
          ? 'OBSERVE'
          : 'HIGH_IMPACT',
      argumentsHash,
      policyDecision:
        event.eventType === 'POLICY_RESOLVED' || event.eventType === 'POLICY_ACTIVATED'
          ? 'PERMIT'
          : 'DENY',
      executionStatus:
        event.eventType === 'POLICY_RESOLVED' || event.eventType === 'POLICY_ACTIVATED'
          ? 'SUCCESS'
          : 'BLOCKED',
    };

    this.auditLedger.record(auditPayload);
    return auditId;
  }

  /**
   * Queries enforcement audit records for a tenant partition.
   * Truy vấn các bản ghi kiểm toán thực thi cho một phân vùng người thuê.
   */
  public getTenantEnforcementAuditTrail(tenantPartition?: string): AuditEvent[] {
    const fullTrail = this.auditLedger.getAuditTrail();
    return fullTrail.filter((evt) => {
      if (evt.domain !== PolicyViolationAuditor.CANONICAL_DOMAIN) return false;
      if (!tenantPartition) return true;
      return evt.actor?.userId === tenantPartition;
    });
  }
}

export const globalPolicyViolationAuditor = new PolicyViolationAuditor();
