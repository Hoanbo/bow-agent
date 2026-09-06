import type { CandidateAction, SemanticIntent } from '../intent/intentTypes.js';
import type { DecisionContext } from '../planning/planningTypes.js';
import type { DecisionCandidate } from './decisionTypes.js';
export declare const SCORING_WEIGHTS: Readonly<{
    intentAlignment: 0.35;
    requiredFieldsComplete: 0.25;
    referenceResolved: 0.2;
    memoryContextRelevance: 0.1;
    intentConfidence: 0.1;
}>;
/**
 * EN: Evaluates and scores a single candidate action against the semantic intent and decision context.
 * VI: Đánh giá và chấm điểm một candidate action duy nhất dựa trên semantic intent và decision context.
 */
export declare function scoreCandidate(action: CandidateAction, intent: SemanticIntent, context?: DecisionContext): DecisionCandidate;
