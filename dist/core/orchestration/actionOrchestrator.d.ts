import type { DecisionResult } from '../decision/decisionTypes.js';
import type { DecisionContext } from '../planning/planningTypes.js';
import type { OrchestrationResult } from './orchestrationTypes.js';
export declare class ActionOrchestrator {
    /**
     * EN: Orchestrates a DecisionResult into an immutable, governed OrchestrationResult.
     * VI: Điều phối DecisionResult thành OrchestrationResult bất biến, có quản trị.
     */
    orchestrate(decision: DecisionResult, context?: DecisionContext): OrchestrationResult;
}
