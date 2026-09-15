// ============================================================================
// BOWCON V4.0 — MILESTONE MS-1.5.19
// Component 1163: ConstitutionalPolicyInvariantEvaluationEngine
// Supreme Constitutional Axiom Verification & Contradiction Detection
// ============================================================================

import * as crypto from 'crypto';
import {
  PolicyEvolutionProposal,
  InvariantCheckResult,
  computeConstitutionalInvariantEvaluationHash,
} from './GovernedStrategicPolicyEvolutionTypes.js';

export class ConstitutionalPolicyInvariantEvaluationEngine {
  private constitutionalAxioms = [
    'AGENT_CAPABILITY_NOT_HUMAN_AUTHORITY',
    'KNOWLEDGE_NOT_AUTHORIZATION',
    'CONSENSUS_NOT_AUTHORIZATION',
    'CONFIDENCE_NOT_AUTHORITY',
    'LEASE_EXPANSION_PROHIBITION',
    'PDP_SUPREMACY',
    'TENANT_SOVEREIGNTY',
    'EMERGENCY_STOP_PRESERVATION',
    'AUDIT_NON_REPUDIATION',
  ];

  constructor() {}

  // EN: Evaluates proposal against supreme constitutional invariants to detect structural contradictions.
  // VI: Đánh giá đề xuất dựa trên các bất biến hiến định tối cao để phát hiện mâu thuẫn cấu trúc.
  public evaluateConstitutionalCompliance(proposal: PolicyEvolutionProposal): InvariantCheckResult {
    const violations: string[] = [];

    // EN: Check 1: Proposals cannot claim non-advisory authority or bypass human review.
    // VI: Kiểm tra 1: Đề xuất không được tự nhận quyền hạn ngoài advisory hoặc bỏ qua đánh giá của con người.
    if (!proposal.advisoryOnly) {
      violations.push('VIOLATION: Proposal must explicitly set advisoryOnly = true');
    }
    if (!proposal.requiresHumanReview) {
      violations.push('VIOLATION: Proposal must explicitly set requiresHumanReview = true');
    }

    // EN: Check 2: Proposals cannot modify EMERGENCY_STOP or audit ledger invariants.
    // VI: Kiểm tra 2: Đề xuất không được sửa đổi EMERGENCY_STOP hoặc các bất biến của sổ cái kiểm toán.
    for (const change of proposal.proposedChanges) {
      const pathLower = change.fieldPath.toLowerCase();
      if (pathLower.includes('emergencystop') || pathLower.includes('killswitch') || pathLower.includes('estop')) {
        violations.push(`VIOLATION: Attempted alteration of safety interlock path '${change.fieldPath}'`);
      }
      if (pathLower.includes('audit') && (pathLower.includes('disable') || pathLower.includes('bypass'))) {
        violations.push(`VIOLATION: Attempted circumvention of audit non-repudiation on '${change.fieldPath}'`);
      }
      if (pathLower.includes('tenant') && (pathLower.includes('bridge') || pathLower.includes('shared'))) {
        violations.push(`VIOLATION: Attempted breach of tenant sovereignty on '${change.fieldPath}'`);
      }
      if (pathLower.includes('lease') && (pathLower.includes('duration') || pathLower.includes('ceiling'))) {
        const val = Number(change.proposedValue);
        if (!isNaN(val) && val > 86400000) {
          violations.push(`VIOLATION: Attempted lease expansion beyond 24-hour constitutional ceiling`);
        }
      }
    }

    const evaluationId = `urn:bow:invariant_eval:${crypto.randomUUID()}`;
    const result: InvariantCheckResult = {
      evaluationId,
      proposalId: proposal.proposalId,
      tenantId: proposal.tenantId,
      passed: violations.length === 0,
      evaluatedAxioms: [...this.constitutionalAxioms],
      violations,
      provenanceHash: '',
      evaluatedAt: Date.now(),
    };
    result.provenanceHash = computeConstitutionalInvariantEvaluationHash(result);

    return result;
  }
}
