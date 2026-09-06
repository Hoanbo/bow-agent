import { createDecisionContext } from './decisionContext.js';
import { createContextAwarePlan } from './actionPlanner.js';
import { validateAgentPlan } from './planValidator.js';
// EN: Stateless facade for deterministic planning. The injected clock is a boundary, not decision input.
// VI: Facade không trạng thái cho planning xác định. Clock được inject là boundary, không phải input quyết định.
export class PlanningService {
    clock;
    constructor(clock = () => '1970-01-01T00:00:00.000Z') {
        this.clock = clock;
    }
    plan(input, semanticIntent) {
        const plan = createContextAwarePlan(createDecisionContext(input, semanticIntent), this.clock());
        const validation = validateAgentPlan(plan);
        if (!validation.valid)
            throw new Error(`Invalid deterministic plan: ${validation.errors.join(',')}`);
        return plan;
    }
}
