// src/core/decision/decisionScorer.ts
// BOWCON V4.0 — MILESTONE 1.3.10: DETERMINISTIC CANDIDATE SCORER
//
// EN:
// Evaluates candidate actions using transparent, explainable, bounded weights.
// Scoring is 100% deterministic with no hidden weights, external LLMs, or random factors.
//
// VI:
// Đánh giá các candidate action bằng các trọng số tường minh, có thể giải thích và có chặn.
// Việc chấm điểm mang tính tất định 100%, không có trọng số ẩn, không LLM bên ngoài hay yếu tố ngẫu nhiên.

import type { CandidateAction, SemanticIntent } from '../intent/intentTypes.js';
import type { DecisionContext } from '../planning/planningTypes.js';
import type { DecisionCandidate } from './decisionTypes.js';
import { bounded } from './decisionConfidence.js';

export const SCORING_WEIGHTS = Object.freeze({
  intentAlignment: 0.35,
  requiredFieldsComplete: 0.25,
  referenceResolved: 0.20,
  memoryContextRelevance: 0.10,
  intentConfidence: 0.10,
});

/**
 * EN: Evaluates and scores a single candidate action against the semantic intent and decision context.
 * VI: Đánh giá và chấm điểm một candidate action duy nhất dựa trên semantic intent và decision context.
 */
export function scoreCandidate(
  action: CandidateAction,
  intent: SemanticIntent,
  context?: DecisionContext,
): DecisionCandidate {
  const factors: string[] = [];
  let totalScore = 0;

  // 1. Intent Alignment Factor (0.35)
  if (action.intentType === intent.intentType) {
    totalScore += SCORING_WEIGHTS.intentAlignment;
    factors.push('intent_alignment');
  }

  // 2. Required Fields Completeness Factor (0.25)
  if (intent.missingParameters.length === 0) {
    totalScore += SCORING_WEIGHTS.requiredFieldsComplete;
    factors.push('required_fields_complete');
  }

  // 3. Reference Resolution Factor (0.20)
  const allReferencesResolved = intent.references.length === 0 || intent.references.every(ref => ref.resolved);
  if (allReferencesResolved) {
    totalScore += SCORING_WEIGHTS.referenceResolved;
    factors.push('context_reference_resolved');
  }

  // 4. Memory / Context Relevance Factor (0.10)
  const hasMemoryContext = Boolean(
    (context?.relevantMemory && context.relevantMemory.length > 0) ||
    (context?.conversationContext && context.conversationContext.length > 0) ||
    intent.entities.length > 0
  );
  if (hasMemoryContext) {
    totalScore += SCORING_WEIGHTS.memoryContextRelevance;
    factors.push('memory_context_relevant');
  }

  // 5. Intent Confidence Factor (0.10 * intent.confidence)
  const confidenceContribution = bounded(intent.confidence) * SCORING_WEIGHTS.intentConfidence;
  totalScore += confidenceContribution;
  if (confidenceContribution > 0) {
    factors.push('intent_confidence');
  }

  const finalScore = bounded(totalScore);

  return Object.freeze({
    action,
    score: finalScore,
    factors: Object.freeze(factors),
  });
}
