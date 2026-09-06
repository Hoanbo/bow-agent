import type { CandidateAction, SemanticIntent } from '../intent/intentTypes.js';
import type { DecisionContext } from '../planning/planningTypes.js';
import type { DecisionCandidate } from './decisionTypes.js';
export interface ActionSelectionResult {
    readonly selected?: DecisionCandidate;
    readonly candidates: readonly DecisionCandidate[];
    readonly rejectedCandidates: readonly DecisionCandidate[];
    readonly tied: boolean;
    readonly tieCandidates: readonly DecisionCandidate[];
}
/**
 * EN: Evaluates, validates, and selects the optimal candidate action deterministically.
 * VI: Đánh giá, xác thực và lựa chọn candidate action tối ưu một cách tất định.
 */
export declare function selectAction(candidates: readonly CandidateAction[], intent: SemanticIntent, context?: DecisionContext): ActionSelectionResult;
