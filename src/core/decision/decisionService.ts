// src/core/decision/decisionService.ts
// BOWCON V4.0 — MILESTONE 1.3.10: AUTHORITATIVE DECISION SERVICE
//
// EN:
// Pure, deterministic, side-effect free decision layer for BOWCON V4.0.
// Determines candidate preferences, explicit uncertainty, clarification needs,
// and governance requirements without executing tools, PDP, or mutating memory.
//
// VI:
// Tầng quyết định thuần túy, tất định, không có side-effect cho BOWCON V4.0.
// Xác định mức ưu tiên của candidate, tính bất định tường minh, nhu cầu làm rõ,
// và các yêu cầu quản trị mà không thực thi tool, PDP hay thay đổi bộ nhớ.

import { selectAction } from './actionSelector.js';
import { createRationale } from './decisionRationale.js';
import { bounded, DECISION_THRESHOLDS } from './decisionConfidence.js';
import { isGovernedRisk, isApprovalRequiredForRisk, preserveRisk } from './decisionRisk.js';
import { validateDecisionInput } from './decisionSchema.js';
import type { DecisionInput, DecisionResult, DecisionState, DecisionUncertainty } from './decisionTypes.js';
import type { StructuredClarification } from '../planning/planningTypes.js';

/**
 * EN: Deterministic FNV-1a 32-bit hash fingerprinting (zero random numbers, zero timestamps).
 * VI: Băm fingerprint 32-bit FNV-1a tất định (không dùng số ngẫu nhiên, không dùng timestamp).
 */
function computeDeterministicFingerprint(text: string): string {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  }
  return `dec_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export class DecisionService {
  /**
   * EN: Evaluates context and plan to produce an immutable DecisionResult.
   * VI: Đánh giá context và plan để sinh ra DecisionResult bất biến.
   */
  public decide(input: DecisionInput): DecisionResult {
    // 1. Rigorous Schema & Security Validation (INV-3, INV-4, INV-10)
    const validation = validateDecisionInput(input);
    if (!validation.valid) {
      return this.block(input, validation.errors);
    }

    const { context, plan } = input;
    const uncertainty: DecisionUncertainty[] = [];

    // 2. Risk Preservation & Escalation Check (INV-7)
    const riskLevel = preserveRisk(plan.riskLevel);

    // 3. Reference Resolution Checks (INV-5, Milestone Section 11)
    const hasUnresolvedReferences = context.semanticIntent.references.some(ref => !ref.resolved);
    if (hasUnresolvedReferences) {
      uncertainty.push({
        reason: 'UNRESOLVED_REFERENCE',
        detail: 'One or more contextual pronouns or references could not be resolved to a single target.',
      });
    }

    // 4. Inherit Planning Clarification if present
    if (plan.requiresClarification) {
      uncertainty.push({
        reason: plan.clarification?.reason || 'PLAN_CLARIFICATION_REQUIRED',
        detail: plan.clarification?.reason,
      });
    }

    // 5. Action Selection & Tie Evaluation (INV-5, INV-6, Section 7)
    const selection = selectAction(context.candidateActions, context.semanticIntent, context);

    if (selection.tied) {
      uncertainty.push({
        reason: 'CANDIDATE_TIE',
        detail: 'Multiple candidate actions have effectively identical evaluation scores; clarification required.',
      });
    }

    // 6. Confidence Calculation (INV-2, INV-5, Section 8)
    const confidence = bounded(
      selection.selected ? selection.selected.score : context.semanticIntent.confidence
    );

    if (confidence < DECISION_THRESHOLDS.clarification) {
      uncertainty.push({
        reason: 'LOW_CONFIDENCE',
        detail: `Decision confidence ${confidence} is below minimum threshold ${DECISION_THRESHOLDS.clarification}.`,
      });
    }

    // 7. Decision State Resolution (Section 9)
    const requiresClarification = uncertainty.length > 0;

    let state: DecisionState;
    if (requiresClarification) {
      state = 'CLARIFY';
    } else if (selection.selected) {
      state = 'PROPOSE_ACTION';
    } else if (context.semanticIntent.actionability === 'INFORMATIONAL') {
      state = 'RESPOND';
    } else {
      state = 'NO_ACTION';
    }

    // 8. Governance & Approval Policy (INV-8, Section 10)
    const governanceRequired = isGovernedRisk(riskLevel);
    const approvalRequired = isApprovalRequiredForRisk(riskLevel, plan.requiresApproval);

    // 9. Structured Clarification Construction (Section 14)
    let clarification: StructuredClarification | undefined;
    if (requiresClarification) {
      if (plan.clarification) {
        clarification = plan.clarification;
      } else {
        const candidateOptions = selection.tied && selection.tieCandidates.length > 0
          ? Object.freeze(selection.tieCandidates.map(c => c.action.intentType))
          : Object.freeze([]);

        clarification = Object.freeze({
          reason: uncertainty[0].reason,
          missingFields: context.semanticIntent.missingParameters,
          candidateOptions,
        });
      }
    }

    // 10. Rationale Construction (Section 15)
    const rationale = createRationale(
      requiresClarification ? undefined : selection.selected,
      selection.candidates
    );

    // 11. Deterministic Fingerprint
    const fingerprintPayload = [
      context.userId,
      context.sessionId,
      plan.planId,
      state,
      confidence.toFixed(4),
      selection.selected?.action.intentType || 'none',
      riskLevel,
    ].join('|');
    const deterministicFingerprint = computeDeterministicFingerprint(fingerprintPayload);

    return Object.freeze({
      success: true,
      state,
      userId: context.userId,
      sessionId: context.sessionId,
      intent: context.semanticIntent,
      selectedAction: requiresClarification ? undefined : selection.selected?.action,
      candidates: selection.candidates,
      confidence,
      uncertainty: Object.freeze(uncertainty),
      requiresClarification,
      clarification,
      riskLevel,
      governanceRequired,
      approvalRequired,
      rationale,
      deterministicFingerprint,
    });
  }

  /**
   * EN: Handles validation failures by returning a fail-closed BLOCK decision result.
   * VI: Xử lý lỗi xác thực bằng cách trả về kết quả quyết định BLOCK fail-closed.
   */
  private block(input: DecisionInput, errors: readonly string[]): DecisionResult {
    const context = input?.context;
    const intent = context?.semanticIntent;

    return Object.freeze({
      success: false,
      state: 'BLOCK',
      userId: context?.userId || '',
      sessionId: context?.sessionId || '',
      intent: intent!,
      candidates: Object.freeze([]),
      confidence: 0,
      uncertainty: Object.freeze(errors.map(reason => Object.freeze({ reason }))),
      requiresClarification: false,
      riskLevel: input?.plan?.riskLevel || 'CRITICAL',
      governanceRequired: true,
      approvalRequired: false,
      rationale: Object.freeze({
        primaryFactors: Object.freeze(['input_validation_failed']),
        rejectedCandidates: Object.freeze([]),
      }),
      deterministicFingerprint: 'dec_blocked',
    });
  }
}
