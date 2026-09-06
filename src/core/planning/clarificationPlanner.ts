import type { DecisionContext, StructuredClarification } from './planningTypes.js';

// EN: Convert semantic uncertainty to structured fields without inventing a conversational answer.
// VI: Chuyển bất định semantic thành field có cấu trúc mà không bịa câu trả lời hội thoại.
export function planClarification(context: DecisionContext): StructuredClarification | undefined {
  const intent = context.semanticIntent;
  if (!intent.requiresClarification && intent.confidence >= 0.5) return undefined;
  return Object.freeze({ reason: intent.clarification[0]?.reason || 'LOW_CONFIDENCE', missingFields: Object.freeze([...intent.missingParameters]), candidateOptions: Object.freeze([]) });
}
