import type { IntentInterpretationInput, SemanticIntent } from '../intent/intentTypes.js';
import type { DecisionContext } from './planningTypes.js';
export declare function createDecisionContext(input: IntentInterpretationInput, semanticIntent: SemanticIntent, currentState?: string): DecisionContext;
