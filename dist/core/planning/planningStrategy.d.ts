import type { DecisionContext } from './planningTypes.js';
export type PlanningStrategy = 'CLARIFY' | 'RESPOND' | 'CONTEXT_RESPONSE' | 'ACTION';
export declare function selectPlanningStrategy(context: DecisionContext): PlanningStrategy;
