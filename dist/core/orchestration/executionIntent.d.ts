import type { CandidateAction } from '../intent/intentTypes.js';
import type { DecisionResult } from '../decision/decisionTypes.js';
import type { PlanRiskLevel } from '../planning/planningTypes.js';
import type { ExecutionIntent } from './orchestrationTypes.js';
/**
 * EN: Maps candidate action types to business capability domains.
 * VI: Ánh xạ loại candidate action sang domain năng lực nghiệp vụ.
 */
export declare function resolveTargetDomain(actionType: string): string;
/**
 * EN: Builds an immutable, defensive copy of ExecutionIntent.
 * VI: Xây dựng bản sao phòng thủ, bất biến của ExecutionIntent.
 */
export declare function createExecutionIntent(decision: DecisionResult, candidate: CandidateAction, customRisk?: PlanRiskLevel): ExecutionIntent;
