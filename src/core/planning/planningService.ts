import { createDecisionContext } from './decisionContext.js';
import { createContextAwarePlan } from './actionPlanner.js';
import { validateAgentPlan } from './planValidator.js';
import type { IntentInterpretationInput, SemanticIntent } from '../intent/intentTypes.js';
import type { ContextAwarePlan } from './planningTypes.js';

// EN: Stateless facade for deterministic planning. The injected clock is a boundary, not decision input.
// VI: Facade không trạng thái cho planning xác định. Clock được inject là boundary, không phải input quyết định.
export class PlanningService {
  constructor(private readonly clock: () => string = () => '1970-01-01T00:00:00.000Z') {}
  public plan(input: IntentInterpretationInput, semanticIntent: SemanticIntent): ContextAwarePlan {
    const plan = createContextAwarePlan(createDecisionContext(input, semanticIntent), this.clock());
    const validation = validateAgentPlan(plan);
    if (!validation.valid) throw new Error(`Invalid deterministic plan: ${validation.errors.join(',')}`);
    return plan;
  }
}
