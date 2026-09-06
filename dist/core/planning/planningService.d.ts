import type { IntentInterpretationInput, SemanticIntent } from '../intent/intentTypes.js';
import type { ContextAwarePlan } from './planningTypes.js';
export declare class PlanningService {
    private readonly clock;
    constructor(clock?: () => string);
    plan(input: IntentInterpretationInput, semanticIntent: SemanticIntent): ContextAwarePlan;
}
