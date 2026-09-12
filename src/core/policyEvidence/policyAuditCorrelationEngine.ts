// src/core/policyEvidence/policyAuditCorrelationEngine.ts
// BOWCON V4.0 — MS-1.3.63: GOVERNED POLICY EVIDENCE QUERY,
// AUDIT CORRELATION & INTEGRITY VERIFICATION LAYER
//
// Governed Policy Audit Correlation Engine (Component 725).
// Correlates policy evidence with canonical AuditLedger records using immutable keys:
// correlationId, candidateId, candidatePolicyVersion, eventId, and provenanceHash.
// Zero fuzzy text matching. Zero secret exposure. Strictly read-only.
//
// Động cơ tương quan kiểm toán chính sách có quản trị (Thành phần 725).
// Tương quan bằng chứng chính sách với các bản ghi AuditLedger chuẩn tắc sử dụng khóa bất biến:
// correlationId, candidateId, candidatePolicyVersion, eventId và provenanceHash.
// Không khớp văn bản mờ. Không để lộ bí mật. Hoàn toàn chỉ đọc.
//
// Authority Invariants:
// - Level 0 Read-Only Audit Correlation
// - CORRELATION != APPROVAL
// - ZERO_AUTONOMOUS_TOKEN_ISSUANCE
// - ZERO_AUTONOMOUS_APPROVAL
// - ZERO_AUTONOMOUS_PROMOTION
// - USER_STOP > ALL_CORRELATION_OPERATIONS
// - STRICT_TENANT_ISOLATION
// - ZERO_SECRET_LEAKAGE: All correlated audit fields sanitized with DiagnosisSanitizer

import crypto from 'node:crypto';
import path from 'node:path';
import {
  type EvidenceCorrelationId,
  type EvidenceCorrelationResult,
  type AuditCorrelationRecord,
  createEvidenceCorrelationId,
} from './policyEvidenceQueryTypes.js';
import type { PolicyCandidateId } from '../policyCanary/policyCanaryTypes.js';
import type { PolicyEvidenceRecord } from '../policyObservability/policyObservabilityTypes.js';
import { AuditLedger, globalAuditLedger, type AuditEvent } from '../auditLedger.js';
import { PolicyEvidenceCollector, globalPolicyEvidenceCollector } from '../policyObservability/policyEvidenceCollector.js';
import { DiagnosisSanitizer, globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';

export interface PolicyAuditCorrelationEngineOptions {
  readonly auditLedger?: AuditLedger;
  readonly evidenceCollector?: PolicyEvidenceCollector;
  readonly sanitizer?: DiagnosisSanitizer;
  readonly isUserStopActive?: () => boolean;
}

export class PolicyAuditCorrelationEngine {
  private readonly auditLedger: AuditLedger;
  private readonly evidenceCollector: PolicyEvidenceCollector;
  private readonly sanitizer: DiagnosisSanitizer;
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(options?: PolicyAuditCorrelationEngineOptions) {
    this.auditLedger = options?.auditLedger ?? globalAuditLedger;
    this.evidenceCollector = options?.evidenceCollector ?? globalPolicyEvidenceCollector;
    this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Audit correlation suspended by USER_STOP supremacy');
    }
  }

  private validateTenant(tenantPartition: string): void {
    if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
      throw new Error('AUDIT_CORRELATION_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
    }
    resolveUserPartition(tenantPartition.trim(), path.resolve(process.cwd(), 'data', 'partitions'));
  }

  /**
   * Correlates policy evidence with canonical AuditLedger records.
   * Matches on immutable identifiers only (correlationId, candidateId, eventId, provenanceHash).
   *
   * Tương quan bằng chứng chính sách với các bản ghi AuditLedger chuẩn tắc.
   * Chỉ khớp trên các định danh bất biến (correlationId, candidateId, eventId, provenanceHash).
   */
  public correlateEvidenceWithAudit(
    tenantPartition: string,
    candidateId?: PolicyCandidateId
  ): EvidenceCorrelationResult {
    // 1. Fail-closed on USER_STOP
    this.assertUserStopInactive();

    // 2. Enforce strict tenant isolation
    this.validateTenant(tenantPartition);

    // 3. Retrieve evidence records for this tenant
    const evidenceRecords = this.evidenceCollector.getAll(tenantPartition);
    const targetEvidence = candidateId
      ? evidenceRecords.filter(r => 'candidateId' in r && r.candidateId === candidateId)
      : evidenceRecords;

    // 4. Retrieve canonical audit trail
    const auditTrail = this.auditLedger.getAuditTrail();

    // 5. Correlate using exact immutable keys
    const correlatedRecords: AuditCorrelationRecord[] = [];
    const matchedEvidenceIds = new Set<string>();

    for (const ev of targetEvidence) {
      // Find matching audit events
      for (const audit of auditTrail) {
        let matched = false;
        let correlationKey = '';

        // Match by correlationId
        if ('correlationId' in ev && ev.correlationId && (audit.idempotencyKey === ev.correlationId || audit.eventId === ev.correlationId)) {
          matched = true;
          correlationKey = `correlationId:${ev.correlationId}`;
        }

        // Match by candidateId in approvalId or idempotencyKey
        if (!matched && 'candidateId' in ev && ev.candidateId && (audit.approvalId === ev.candidateId || audit.idempotencyKey === ev.candidateId)) {
          matched = true;
          correlationKey = `candidateId:${ev.candidateId}`;
        }

        // Match by provenanceHash
        if (!matched && 'provenanceHash' in ev && (ev as any).provenanceHash && audit.argumentsHash === (ev as any).provenanceHash) {
          matched = true;
          correlationKey = `provenanceHash:${(ev as any).provenanceHash}`;
        }

        // Match by evidenceId in idempotencyKey
        if (!matched && audit.idempotencyKey === ev.evidenceId) {
          matched = true;
          correlationKey = `evidenceId:${ev.evidenceId}`;
        }

        if (matched) {
          matchedEvidenceIds.add(ev.evidenceId);

          // Deeply sanitize sensitive fields from the correlation output
          const sanitizedTool = this.sanitizer.sanitizeString(audit.toolName);
          const sanitizedDomain = this.sanitizer.sanitizeString(audit.domain);

          correlatedRecords.push({
            evidenceId: ev.evidenceId,
            evidenceEventType: ev.eventType,
            auditEventId: audit.eventId,
            auditDomain: sanitizedDomain,
            auditTimestamp: audit.timestamp,
            auditToolName: sanitizedTool,
            auditPolicyDecision: audit.policyDecision,
            correlationKey,
            provenanceHash: 'provenanceHash' in ev ? (ev as any).provenanceHash : undefined,
          });
        }
      }
    }

    // Sort correlated records deterministically
    correlatedRecords.sort((a, b) => {
      const timeCmp = a.auditTimestamp.localeCompare(b.auditTimestamp);
      if (timeCmp !== 0) return timeCmp;
      return a.evidenceId.localeCompare(b.evidenceId);
    });

    const correlationId = createEvidenceCorrelationId(
      `ecorr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
    );

    return Object.freeze({
      correlationId,
      tenantPartition,
      candidateId,
      matchedCount: correlatedRecords.length,
      unmatchedEvidenceCount: targetEvidence.length - matchedEvidenceIds.size,
      correlatedRecords: Object.freeze(correlatedRecords),
      analyzedAt: new Date().toISOString(),
    });
  }
}

export const globalPolicyAuditCorrelationEngine = new PolicyAuditCorrelationEngine();
