import type { DecisionState } from '../decision/decisionTypes.js';
import type { PlanRiskLevel } from '../planning/planningTypes.js';
import type { OrchestrationStatus } from './orchestrationTypes.js';
export interface GateEvaluation {
    readonly status: OrchestrationStatus;
    readonly canProceedToGovernance: boolean;
    readonly reason: string;
}
/**
 * EN: Maps DecisionState and risk classification to authoritative OrchestrationStatus.
 * VI: Ánh xạ DecisionState và phân loại rủi ro sang OrchestrationStatus có thẩm quyền.
 */
export declare function evaluateExecutionGate(state: DecisionState, risk: PlanRiskLevel, hasSelectedAction: boolean): GateEvaluation;
