import type { DecisionContext } from './planningTypes.js';

export type PlanningStrategy = 'CLARIFY' | 'RESPOND' | 'CONTEXT_RESPONSE' | 'ACTION';

export function selectPlanningStrategy(context: DecisionContext): PlanningStrategy {
  if (context.semanticIntent.requiresClarification || context.semanticIntent.confidence < 0.5) return 'CLARIFY';
  if (context.semanticIntent.actionability === 'INFORMATIONAL') return context.semanticIntent.references.some(reference => reference.resolved) ? 'CONTEXT_RESPONSE' : 'RESPOND';
  return 'ACTION';
}
