// src/core/policyEvidence/policyEvidenceInvestigationService.ts
// BOWCON V4.0 — MS-1.3.63: GOVERNED POLICY EVIDENCE QUERY,
// AUDIT CORRELATION & INTEGRITY VERIFICATION LAYER
//
// Governed Policy Evidence Investigation Service (Component 727).
// Master read-only facade for policy candidate evidence investigations.
// Coordinates evidence queries, lifecycle trace reconstruction, audit correlation,
// independent integrity verification, and unified investigation summaries.
// Zero autonomous authority. Absolutely read-only.
//
// Dịch vụ điều tra bằng chứng chính sách có quản trị (Thành phần 727).
// Mặt tiền chỉ đọc chính cho các cuộc điều tra bằng chứng ứng viên chính sách.
// Phối hợp truy vấn bằng chứng, tái tạo dấu vết vòng đời, tương quan kiểm toán,
// xác minh tính toàn vẹn độc lập và tóm tắt điều tra thống nhất.
// Không có thẩm quyền tự động. Hoàn toàn chỉ đọc.
//
// Authority Invariants:
// - Level 0 Read-Only Investigation Facade
// - INVESTIGATION != EXECUTION
// - NO_PROMOTE: Has no promote() method.
// - NO_APPROVE: Has no approve() method.
// - NO_TOKEN_ISSUANCE: Has no issueToken() method.
// - NO_ROLLBACK: Has no rollback() method.
// - NO_CIRCUIT_BREAKER_RESET: Has no resetCircuitBreaker() method.
// - NO_TOOL_EXECUTION: Has no executeTool() method.
// - USER_STOP > ALL_INVESTIGATION_OPERATIONS
// - STRICT_TENANT_ISOLATION

import path from 'node:path';
import {
  type EvidenceQueryFilter,
  type EvidenceQueryResult,
  type PolicyLifecycleTrace,
  type EvidenceCorrelationResult,
  type IntegrityVerificationResult,
  type InvestigationSummary,
} from './policyEvidenceQueryTypes.js';
import type { PolicyCandidateId } from '../policyCanary/policyCanaryTypes.js';
import { PolicyEvidenceQueryEngine, globalPolicyEvidenceQueryEngine } from './policyEvidenceQueryEngine.js';
import { PolicyLifecycleTraceEngine, globalPolicyLifecycleTraceEngine } from './policyLifecycleTraceEngine.js';
import { PolicyAuditCorrelationEngine, globalPolicyAuditCorrelationEngine } from './policyAuditCorrelationEngine.js';
import { PolicyEvidenceIntegrityVerifier, globalPolicyEvidenceIntegrityVerifier } from './policyEvidenceIntegrityVerifier.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';

export interface PolicyEvidenceInvestigationServiceOptions {
  readonly queryEngine?: PolicyEvidenceQueryEngine;
  readonly traceEngine?: PolicyLifecycleTraceEngine;
  readonly correlationEngine?: PolicyAuditCorrelationEngine;
  readonly integrityVerifier?: PolicyEvidenceIntegrityVerifier;
  readonly isUserStopActive?: () => boolean;
}

export class PolicyEvidenceInvestigationService {
  private readonly queryEngine: PolicyEvidenceQueryEngine;
  private readonly traceEngine: PolicyLifecycleTraceEngine;
  private readonly correlationEngine: PolicyAuditCorrelationEngine;
  private readonly integrityVerifier: PolicyEvidenceIntegrityVerifier;
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(options?: PolicyEvidenceInvestigationServiceOptions) {
    this.queryEngine = options?.queryEngine ?? globalPolicyEvidenceQueryEngine;
    this.traceEngine = options?.traceEngine ?? globalPolicyLifecycleTraceEngine;
    this.correlationEngine = options?.correlationEngine ?? globalPolicyAuditCorrelationEngine;
    this.integrityVerifier = options?.integrityVerifier ?? globalPolicyEvidenceIntegrityVerifier;
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Investigation service operations suspended by USER_STOP');
    }
  }

  private validateTenant(tenantPartition: string): void {
    if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
      throw new Error('INVESTIGATION_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
    }
    resolveUserPartition(tenantPartition.trim(), path.resolve(process.cwd(), 'data', 'partitions'));
  }

  /**
   * Executes a bounded, deterministic read-only query for policy evidence records.
   * Thực thi truy vấn chỉ đọc có giới hạn, xác định cho các bản ghi bằng chứng chính sách.
   */
  public queryEvidence(filter: EvidenceQueryFilter): EvidenceQueryResult {
    this.assertUserStopInactive();
    this.validateTenant(filter.tenantPartition);
    return this.queryEngine.queryEvidence(filter);
  }

  /**
   * Reconstructs the complete lifecycle trace for a policy candidate.
   * Tái tạo dấu vết vòng đời hoàn chỉnh cho một ứng viên chính sách.
   */
  public getPolicyLifecycleTrace(
    tenantPartition: string,
    candidateId: PolicyCandidateId
  ): PolicyLifecycleTrace {
    this.assertUserStopInactive();
    this.validateTenant(tenantPartition);
    return this.traceEngine.reconstructTrace(tenantPartition, candidateId);
  }

  /**
   * Correlates policy evidence with canonical AuditLedger events.
   * Tương quan bằng chứng chính sách với các sự kiện AuditLedger chuẩn tắc.
   */
  public correlateAudit(
    tenantPartition: string,
    candidateId?: PolicyCandidateId
  ): EvidenceCorrelationResult {
    this.assertUserStopInactive();
    this.validateTenant(tenantPartition);
    return this.correlationEngine.correlateEvidenceWithAudit(tenantPartition, candidateId);
  }

  /**
   * Independently verifies the evidence integrity for a policy candidate.
   * Xác minh độc lập tính toàn vẹn của bằng chứng cho một ứng viên chính sách.
   */
  public verifyIntegrity(
    tenantPartition: string,
    candidateId: PolicyCandidateId
  ): IntegrityVerificationResult {
    this.assertUserStopInactive();
    this.validateTenant(tenantPartition);
    return this.integrityVerifier.verifyIntegrity(tenantPartition, candidateId);
  }

  /**
   * Synthesizes a comprehensive read-only investigation summary for a policy candidate.
   * Answering "What happened to this policy candidate?".
   *
   * Tổng hợp tóm tắt điều tra chỉ đọc toàn diện cho một ứng viên chính sách.
   * Trả lời câu hỏi "Điều gì đã xảy ra với ứng viên chính sách này?".
   */
  public getInvestigationSummary(
    tenantPartition: string,
    candidateId: PolicyCandidateId
  ): InvestigationSummary {
    this.assertUserStopInactive();
    this.validateTenant(tenantPartition);

    const lifecycleTrace = this.getPolicyLifecycleTrace(tenantPartition, candidateId);
    const integrityResult = this.verifyIntegrity(tenantPartition, candidateId);
    const auditCorrelation = this.correlateAudit(tenantPartition, candidateId);

    const advisorySummary = `[INVESTIGATION_SUMMARY] Candidate ${candidateId} (version: ${lifecycleTrace.candidatePolicyVersion}) in tenant '${tenantPartition}'. Current ring: ${lifecycleTrace.currentRing}, state: ${lifecycleTrace.currentState}. Globally active: ${lifecycleTrace.isGloballyActive}. Rolled back: ${lifecycleTrace.wasRolledBack}. Circuit breaker: ${lifecycleTrace.wasCircuitBreakerTripped}. Integrity status: ${integrityResult.status} (provenance valid: ${integrityResult.provenanceValid}). Audit matches: ${auditCorrelation.matchedCount}. This report is strictly read-only and carries zero operational or promotion authority.`;

    return Object.freeze({
      candidateId,
      tenantPartition,
      candidatePolicyVersion: lifecycleTrace.candidatePolicyVersion,
      lifecycleTrace,
      integrityResult,
      auditCorrelation,
      generatedAt: new Date().toISOString(),
      advisorySummary,
    });
  }
}

export const globalPolicyEvidenceInvestigationService = new PolicyEvidenceInvestigationService();
