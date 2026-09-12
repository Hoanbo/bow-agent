// src/core/policyDecision/policyDecisionEngine.ts
// BOWCON V4.0 — MS-1.3.64: GOVERNED POLICY DECISION & CONTROLLED REMEDIATION LAYER
//
// Governed Policy Decision Engine (Component 729).
// Consumes verified policy evidence from MS-1.3.63 investigation results,
// validates integrity status, enforces evidence freshness, and synthesizes
// deterministic decision proposals.
// Strictly requires human review. Zero autonomous approval. Zero tool execution.
//
// Động cơ quyết định chính sách có quản trị (Thành phần 729).
// Tiêu thụ bằng chứng chính sách đã xác minh từ kết quả điều tra MS-1.3.63,
// xác thực tính toàn vẹn, thực thi độ tươi mới của bằng chứng và tổng hợp
// các đề xuất quyết định có tính xác định.
// Nghiêm ngặt yêu cầu con người xem xét. Không tự động phê duyệt. Không thực thi công cụ.
//
// Authority Invariants:
// - Level 0 Decision Proposal Generation
// - OBSERVATION != DECISION
// - ZERO_AUTONOMOUS_APPROVAL: Proposals require explicit human operator action
// - ZERO_AUTONOMOUS_TOKEN_ISSUANCE
// - USER_STOP > ALL_DECISION_OPERATIONS
// - STRICT_TENANT_ISOLATION
// - STALE_EVIDENCE_FAIL_CLOSED

import crypto from 'node:crypto';
import path from 'node:path';
import {
  type DecisionId,
  type DecisionProposalId,
  type PolicyDecisionProposal,
  type PolicyRemediationType,
  type DecisionRejectionReason,
  type ProposalExpirationReason,
  type DecisionEvidenceLinkage,
  createDecisionId,
  createDecisionProposalId,
} from './policyDecisionTypes.js';
import type { PolicyCandidateId } from '../policyCanary/policyCanaryTypes.js';
import type { InvestigationSummary } from '../policyEvidence/policyEvidenceQueryTypes.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';

export const DEFAULT_MAX_EVIDENCE_STALENESS_MS = 3600000; // 1 hour / 1 giờ
export const DEFAULT_PROPOSAL_TTL_MS = 86400000; // 24 hours / 24 giờ

export interface PolicyDecisionEngineOptions {
  readonly isUserStopActive?: () => boolean;
  readonly maxStalenessMs?: number;
  readonly proposalTtlMs?: number;
}

export class PolicyDecisionEngine {
  private readonly isUserStopActiveFn?: () => boolean;
  private readonly maxStalenessMs: number;
  private readonly proposalTtlMs: number;
  // Map<tenantPartition, Map<proposalId, PolicyDecisionProposal>>
  private readonly proposals = new Map<string, Map<string, PolicyDecisionProposal>>();

  constructor(options?: PolicyDecisionEngineOptions) {
    this.isUserStopActiveFn = options?.isUserStopActive;
    this.maxStalenessMs = options?.maxStalenessMs ?? DEFAULT_MAX_EVIDENCE_STALENESS_MS;
    this.proposalTtlMs = options?.proposalTtlMs ?? DEFAULT_PROPOSAL_TTL_MS;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Decision operations suspended by USER_STOP supremacy');
    }
  }

  private validateTenant(tenantPartition: string): void {
    if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
      throw new Error('DECISION_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
    }
    resolveUserPartition(tenantPartition.trim(), path.resolve(process.cwd(), 'data', 'partitions'));
  }

  private getTenantBucket(tenantPartition: string): Map<string, PolicyDecisionProposal> {
    let bucket = this.proposals.get(tenantPartition);
    if (!bucket) {
      bucket = new Map();
      this.proposals.set(tenantPartition, bucket);
    }
    return bucket;
  }

  /**
   * Evaluates verified investigation summary and generates a deterministic PolicyDecisionProposal.
   * Đánh giá tóm tắt điều tra đã xác minh và tạo một PolicyDecisionProposal có tính xác định.
   */
  public generateProposal(summary: InvestigationSummary): PolicyDecisionProposal {
    // 1. Fail closed on USER_STOP
    this.assertUserStopInactive();

    // 2. Strict tenant isolation
    this.validateTenant(summary.tenantPartition);

    if (!summary.candidateId || typeof summary.candidateId !== 'string' || summary.candidateId.trim().length === 0) {
      throw new Error('INVALID_CANDIDATE_ID: candidateId must be a non-empty string');
    }

    // 3. Validate integrity status
    if (summary.integrityResult.status === 'INVALID') {
      throw new Error('INVALID_EVIDENCE_INTEGRITY: Cannot generate proposal from INVALID evidence integrity');
    }

    if (summary.integrityResult.status === 'MISSING') {
      throw new Error('MISSING_EVIDENCE: Cannot generate proposal from MISSING evidence');
    }

    // 4. Validate evidence freshness
    const now = Date.now();
    const generatedTime = new Date(summary.generatedAt).getTime();
    if (Number.isNaN(generatedTime) || now - generatedTime > this.maxStalenessMs) {
      throw new Error(`STALE_EVIDENCE_REJECTED: Investigation evidence age (${now - generatedTime}ms) exceeds maximum allowable staleness (${this.maxStalenessMs}ms)`);
    }

    // 5. Derive deterministic recommendation
    const trace = summary.lifecycleTrace;
    let recommendation: PolicyRemediationType = 'HOLD_CANARY';
    let rationale = 'Default holding review pending further canary observation.';

    if (trace.wasCircuitBreakerTripped) {
      recommendation = 'BLOCK_POLICY_CANDIDATE';
      rationale = 'Circuit breaker was tripped during canary pipeline; candidate must be blocked.';
    } else if (trace.wasRolledBack) {
      recommendation = 'ROLLBACK_TO_BASELINE';
      rationale = `Canary candidate was rolled back from ring ${trace.currentRing} (reason: ${trace.rollbackReason ?? 'SAFETY_REGRESSION'}). Baseline restoration required.`;
    } else if (summary.integrityResult.status === 'DEGRADED') {
      recommendation = 'QUARANTINE_BROKEN_PROVENANCE';
      rationale = 'Evidence integrity is DEGRADED. Candidate must be quarantined until provenance is reconciled.';
    } else if (trace.events.some(e => e.eventType === 'MISMATCH')) {
      const mismatchCount = trace.events.filter(e => e.eventType === 'MISMATCH').length;
      if (mismatchCount >= 3) {
        recommendation = 'HOLD_CANARY';
        rationale = `Elevated decision divergence observed (${mismatchCount} mismatches). Hold canary pending calibration.`;
      }
    } else if (trace.isGloballyActive) {
      recommendation = 'PROCEED_TO_NEXT_RING_REVIEW';
      rationale = 'Candidate reached global activation with unbroken provenance and zero safety regressions.';
    }

    const proposalId = createDecisionProposalId(`prop_${now}_${crypto.randomBytes(4).toString('hex')}`);
    const decisionId = createDecisionId(`dec_${now}_${crypto.randomBytes(4).toString('hex')}`);

    const evidenceLinkage: DecisionEvidenceLinkage = {
      tenantPartition: summary.tenantPartition,
      candidateId: summary.candidateId,
      candidatePolicyVersion: summary.candidatePolicyVersion,
      traceId: trace.traceId,
      evidenceIds: summary.lifecycleTrace.events.map(e => e.eventId as any),
      integrityStatus: summary.integrityResult.status,
      provenanceHeadHash: summary.integrityResult.provenanceHeadHash,
      evidenceTimestamp: summary.generatedAt,
      verifiedAt: summary.integrityResult.verifiedAt,
    };

    const proposal: PolicyDecisionProposal = Object.freeze({
      proposalId,
      decisionId,
      tenantPartition: summary.tenantPartition,
      candidateId: summary.candidateId,
      state: 'PENDING_HUMAN_REVIEW',
      recommendation,
      rationale,
      evidenceLinkage: Object.freeze(evidenceLinkage),
      requiresHumanAuthorization: true,
      proposedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + this.proposalTtlMs).toISOString(),
    });

    this.getTenantBucket(summary.tenantPartition).set(proposalId, proposal);
    return proposal;
  }

  /**
   * Retrieves a proposal by tenant and ID.
   * Lấy đề xuất theo người thuê và mã định danh.
   */
  public getProposal(tenantPartition: string, proposalId: DecisionProposalId): PolicyDecisionProposal {
    this.assertUserStopInactive();
    this.validateTenant(tenantPartition);

    const bucket = this.getTenantBucket(tenantPartition);
    const proposal = bucket.get(proposalId);
    if (!proposal) {
      throw new Error(`PROPOSAL_NOT_FOUND: Proposal '${proposalId}' not found for tenant '${tenantPartition}'`);
    }

    // Auto-expire if past TTL
    if (proposal.state === 'PENDING_HUMAN_REVIEW' || proposal.state === 'PROPOSED') {
      if (Date.now() > new Date(proposal.expiresAt).getTime()) {
        const expiredProposal: PolicyDecisionProposal = Object.freeze({
          ...proposal,
          state: 'EXPIRED',
          expirationReason: 'REVIEW_TIMEOUT',
        });
        bucket.set(proposalId, expiredProposal);
        return expiredProposal;
      }
    }

    return proposal;
  }

  /**
   * Explicitly approves a decision proposal by an authorized human operator.
   * Phê duyệt rõ ràng đề xuất quyết định bởi người vận hành con người được ủy quyền.
   */
  public approveProposal(
    tenantPartition: string,
    proposalId: DecisionProposalId,
    operatorUserId: string
  ): PolicyDecisionProposal {
    this.assertUserStopInactive();
    this.validateTenant(tenantPartition);

    if (!operatorUserId || typeof operatorUserId !== 'string' || operatorUserId.trim().length === 0) {
      throw new Error('OPERATOR_AUTHORIZATION_REQUIRED: Valid human operator ID required to approve proposal');
    }

    const proposal = this.getProposal(tenantPartition, proposalId);
    if (proposal.state !== 'PENDING_HUMAN_REVIEW' && proposal.state !== 'PROPOSED') {
      throw new Error(`ILLEGAL_STATE_TRANSITION: Cannot approve proposal in state '${proposal.state}'`);
    }

    const approvedProposal: PolicyDecisionProposal = Object.freeze({
      ...proposal,
      state: 'APPROVED',
      reviewedBy: operatorUserId,
      reviewedAt: new Date().toISOString(),
    });

    this.getTenantBucket(tenantPartition).set(proposalId, approvedProposal);
    return approvedProposal;
  }

  /**
   * Explicitly rejects a decision proposal.
   * Từ chối rõ ràng một đề xuất quyết định.
   */
  public rejectProposal(
    tenantPartition: string,
    proposalId: DecisionProposalId,
    operatorUserId: string,
    reason: DecisionRejectionReason
  ): PolicyDecisionProposal {
    this.assertUserStopInactive();
    this.validateTenant(tenantPartition);

    const proposal = this.getProposal(tenantPartition, proposalId);
    if (proposal.state !== 'PENDING_HUMAN_REVIEW' && proposal.state !== 'PROPOSED') {
      throw new Error(`ILLEGAL_STATE_TRANSITION: Cannot reject proposal in state '${proposal.state}'`);
    }

    const rejectedProposal: PolicyDecisionProposal = Object.freeze({
      ...proposal,
      state: 'REJECTED',
      rejectionReason: reason,
      reviewedBy: operatorUserId,
      reviewedAt: new Date().toISOString(),
    });

    this.getTenantBucket(tenantPartition).set(proposalId, rejectedProposal);
    return rejectedProposal;
  }

  /**
   * Cancels a proposal, e.g. when cancelled by USER_STOP or superseded.
   * Hủy đề xuất, ví dụ khi bị hủy bởi USER_STOP hoặc bị thay thế.
   */
  public cancelProposal(
    tenantPartition: string,
    proposalId: DecisionProposalId,
    reason: string
  ): PolicyDecisionProposal {
    this.validateTenant(tenantPartition);

    const bucket = this.getTenantBucket(tenantPartition);
    const proposal = bucket.get(proposalId);
    if (!proposal) {
      throw new Error(`PROPOSAL_NOT_FOUND: Proposal '${proposalId}' not found for tenant '${tenantPartition}'`);
    }

    const cancelledProposal: PolicyDecisionProposal = Object.freeze({
      ...proposal,
      state: 'CANCELLED',
      rationale: `${proposal.rationale} [CANCELLED: ${reason}]`,
    });

    bucket.set(proposalId, cancelledProposal);
    return cancelledProposal;
  }
}

export const globalPolicyDecisionEngine = new PolicyDecisionEngine();
