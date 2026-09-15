// src/core/governedCrossFederationConvergence/PolicyMetaGovernanceEngine.ts
// BOWCON V4.0 — MS-1.5.17: GOVERNED CROSS-FEDERATION STRATEGY, CONVERGENCE & POLICY META-GOVERNANCE ENGINE
// Component 1144 — REAL
//
// EN: Policy alignment, lease invariant arbiter, and privilege escalation barrier.
// VI: Căn chỉnh chính sách, trọng tài bất biến lease và rào cản leo thang đặc quyền.

import {
  GovernedCrossFederationPolicyError,
  GovernedCrossFederationLeaseError,
  type PolicyMetaEvaluation,
  type CrossFederationStrategyProposal,
  computePolicyMetaEvaluationHash,
} from './GovernedCrossFederationTypes.js';

export interface PolicyRule {
  readonly ruleId: string;
  readonly name: string;
  readonly disallowedActionPatterns: readonly string[];
  readonly maxAllowedResourceCost: number;
}

export class PolicyMetaGovernanceEngine {
  private readonly rules = new Map<string, PolicyRule>();

  public registerPolicyRule(rule: PolicyRule): void {
    this.rules.set(rule.ruleId, Object.freeze({ ...rule }));
  }

  // EN: Evaluate cross-federation strategy proposal against organizational policies (FAIL-CLOSED)
  // VI: Đánh giá đề xuất chiến lược liên liên đoàn theo các chính sách tổ chức (FAIL-CLOSED)
  public evaluateStrategy(
    tenantId: string,
    sessionId: string,
    proposal: CrossFederationStrategyProposal,
    activeLeaseIds: ReadonlySet<string>
  ): PolicyMetaEvaluation {
    // 1. Lease Invariant Validation: Proposal's lease must be active
    if (!proposal.leaseId || !activeLeaseIds.has(proposal.leaseId)) {
      throw new GovernedCrossFederationLeaseError(
        `Lease invariant violation: Federation ${proposal.federationId} proposal ${proposal.proposalId} uses expired or invalid lease ${proposal.leaseId}`,
        tenantId,
        sessionId
      );
    }

    // 2. Privilege Escalation Barrier: A proposal cannot command or claim authority over another federation
    const lowerGoal = proposal.strategicGoal.toLowerCase();
    if (
      lowerGoal.includes('takeover') ||
      lowerGoal.includes('escalate_privilege') ||
      lowerGoal.includes('command_all_federations') ||
      lowerGoal.includes('override_policy')
    ) {
      throw new GovernedCrossFederationPolicyError(
        `Privilege escalation attempt detected in proposal ${proposal.proposalId}`,
        tenantId,
        sessionId
      );
    }

    // 3. Evaluate against registered policies
    let compliant = true;
    let violationReason: string | undefined;
    const appliedRuleIds: string[] = [];

    for (const rule of this.rules.values()) {
      appliedRuleIds.push(rule.ruleId);

      // Check cost ceiling
      if (proposal.estimatedResourceCost > rule.maxAllowedResourceCost) {
        compliant = false;
        violationReason = `Resource cost ${proposal.estimatedResourceCost} exceeds policy rule ${rule.ruleId} ceiling of ${rule.maxAllowedResourceCost}`;
        break;
      }

      // Check disallowed actions
      for (const action of proposal.plannedActions) {
        const lowerAction = action.toLowerCase();
        for (const disallowed of rule.disallowedActionPatterns) {
          if (lowerAction.includes(disallowed.toLowerCase())) {
            compliant = false;
            violationReason = `Action "${action}" violates policy rule ${rule.ruleId} (disallowed pattern: "${disallowed}")`;
            break;
          }
        }
        if (!compliant) break;
      }

      if (!compliant) break;
    }

    const cleanEvaluation: Omit<PolicyMetaEvaluation, 'provenanceHash'> = {
      evaluationId: `pme_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      tenantId,
      sessionId,
      evaluatedStrategyHash: proposal.provenanceHash,
      policyRuleIds: Object.freeze(appliedRuleIds),
      compliant,
      violationReason,
      timestamp: Date.now(),
    };

    const provenanceHash = computePolicyMetaEvaluationHash(cleanEvaluation);
    return Object.freeze({
      ...cleanEvaluation,
      provenanceHash,
    });
  }

  public clear(): void {
    this.rules.clear();
  }
}
