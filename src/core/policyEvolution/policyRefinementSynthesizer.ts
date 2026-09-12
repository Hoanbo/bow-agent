// src/core/policyEvolution/policyRefinementSynthesizer.ts
// BOWCON V4.0 — MS-1.3.58: GOVERNED OPERATIONAL POLICY EVOLUTION, GUARDRAIL CALIBRATION & COUNTERFACTUAL RESILIENCE VERIFICATION PIPELINE
//
// Governed policy refinement proposal synthesizer.
// Consumes historical cross-incident intelligence artifacts (PolicyRefinementAdvisory,
// SystemicFailurePattern, RemediationReliabilityRecord) from MS-1.3.57 and synthesizes
// structured, auditable PolicyEvolutionProposal candidates.
// Authority Invariant: Level 1 Advisory Recommendation / Proposal Staging ONLY.
// Zero active policy mutation, zero issueToken() calls, zero approve() calls.
// Động cơ tổng hợp đề xuất tinh chỉnh chính sách có quản trị.
// Tiếp nhận các hiện vật tình báo liên sự cố lịch sử từ MS-1.3.57 và tổng hợp các ứng viên Đề xuất Tiến hóa Chính sách.
// Bất biến thẩm quyền: CHỈ Khuyến nghị Tư vấn Cấp 1 / Chuẩn bị Đề xuất.

import {
  type PolicyEvolutionProposal,
  type PolicyDiff,
  type EvolutionVersionId,
  createPolicyProposalId,
} from './policyEvolutionTypes.js';
import type {
  PolicyRefinementAdvisory,
  SystemicFailurePattern,
  RemediationReliabilityRecord,
} from '../crossIncident/crossIncidentTypes.js';
import type { ActionClassification } from '../policyDecisionPoint.js';

export interface SynthesizeProposalInput {
  readonly advisories: readonly PolicyRefinementAdvisory[];
  readonly systemicPatterns?: readonly SystemicFailurePattern[];
  readonly remediationRecords?: readonly RemediationReliabilityRecord[];
  readonly baseVersionId: EvolutionVersionId;
  readonly targetAction?: string;
  readonly proposedClassification?: ActionClassification;
  readonly rationale?: string;
}

export class PolicyRefinementSynthesizer {
  /**
   * Synthesizes a structured, non-mutating PolicyEvolutionProposal from cross-incident advisories and metrics.
   * Total authority is strictly Level 1 advisory: POLICY_PROPOSAL != POLICY_MUTATION.
   * Tổng hợp một đề xuất tiến hóa chính sách có cấu trúc, không biến đổi từ các tư vấn và số liệu liên sự cố.
   */
  public synthesizeProposal(input: SynthesizeProposalInput): PolicyEvolutionProposal {
    if (!input.advisories || input.advisories.length === 0) {
      throw new Error('SYNTHESIS_FAILED: At least one PolicyRefinementAdvisory is required as source evidence.');
    }
    if (!input.baseVersionId) {
      throw new Error('SYNTHESIS_FAILED: baseVersionId must be provided to anchor policy evolution diff.');
    }

    const sourceAdvisoryIds = input.advisories.map((a) => a.advisoryId);
    const sourceIncidentIds: string[] = [];

    // Extract constituent incidents from systemic patterns if available
    if (input.systemicPatterns) {
      for (const pattern of input.systemicPatterns) {
        sourceIncidentIds.push(...pattern.constituentIncidentIds);
      }
    }

    // Determine target action and proposed classification from advisory
    const primaryAdvisory = input.advisories[0];
    const targetAction = input.targetAction ?? String(primaryAdvisory.actionClass);
    const proposedClass = input.proposedClassification ?? 'REVERSIBLE';

    const addedClassifications: Record<string, ActionClassification> = {};
    const modifiedClassifications: Record<string, ActionClassification> = {};

    modifiedClassifications[targetAction] = proposedClass;

    const candidatePolicyDiff: PolicyDiff = {
      addedClassifications: Object.freeze(addedClassifications),
      modifiedClassifications: Object.freeze(modifiedClassifications),
      modifiedGuardrails: Object.freeze({
        minApprovalTimeoutMs: 30000,
        maxRetries: 3,
      }),
    };

    const affectedPolicyFields = Object.keys(modifiedClassifications);

    // Compute heuristic proposal confidence bounded between [0.05, 0.95]
    let baseConfidence = 0.70;
    if (primaryAdvisory.approvalRate > 0.8) baseConfidence += 0.15;
    if (input.systemicPatterns && input.systemicPatterns.length > 0) baseConfidence += 0.05;
    const confidence = Math.max(0.05, Math.min(0.95, Math.round(baseConfidence * 100) / 100));

    // Determine risk classification
    let riskClassification: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (proposedClass === 'HIGH_IMPACT' || targetAction.includes('exec') || targetAction.includes('rollback')) {
      riskClassification = 'HIGH';
    } else if (proposedClass === 'REVERSIBLE') {
      riskClassification = 'MEDIUM';
    }

    const rationale = input.rationale ??
      `Policy evolution proposal synthesized from ${input.advisories.length} supervisory advisories. Source recommendation: "${primaryAdvisory.advisoryRecommendation}".`;

    const evidenceSummary = `Advisory approvals: ${primaryAdvisory.totalApprovals}, denials: ${primaryAdvisory.totalDenials}, overrides: ${primaryAdvisory.totalOverrides}. Pattern count: ${input.systemicPatterns?.length ?? 0}.`;

    const proposalId = createPolicyProposalId(`prop_${Date.now()}_${targetAction.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 16)}`);

    return {
      proposalId,
      sourceAdvisoryIds: Object.freeze(sourceAdvisoryIds),
      sourceIncidentIds: Object.freeze(Array.from(new Set(sourceIncidentIds))),
      baseVersionId: input.baseVersionId,
      candidatePolicyDiff: Object.freeze(candidatePolicyDiff),
      affectedPolicyFields: Object.freeze(affectedPolicyFields),
      rationale,
      evidenceSummary,
      expectedOperationalImprovement: 'Reduction in supervisory approval overhead and aligned gate friction.',
      expectedSafetyImpact: 'Preserves hard forbidden barriers while calibrating nominal operational thresholds.',
      confidence,
      riskClassification,
      status: 'DRAFT',
      createdAt: Date.now(),
    };
  }
}
