import { classifyPlanRisk } from './planRiskClassifier.js';
import { planClarification } from './clarificationPlanner.js';
import { selectPlanningStrategy } from './planningStrategy.js';
const step = (order, type, description, riskLevel, requiresApproval = false, dependencies = [], candidateAction) => Object.freeze({ stepId: `step-${order}-${type}`, order, type, description, dependencies: Object.freeze(dependencies), riskLevel, requiresApproval, candidateAction });
// EN: Produce deterministic steps only. A proposed EXECUTE_TOOL step is still inert until AgentLoop sends it to PDP.
// VI: Chỉ tạo các step xác định. Step EXECUTE_TOOL được đề xuất vẫn không hoạt động cho tới khi AgentLoop gửi nó đến PDP.
export function createContextAwarePlan(context, createdAt = '1970-01-01T00:00:00.000Z') {
    const strategy = selectPlanningStrategy(context);
    const riskLevel = classifyPlanRisk(context.semanticIntent);
    const clarification = planClarification(context);
    const steps = [];
    if (strategy === 'CLARIFY')
        steps.push(step(1, 'ASK_CLARIFICATION', 'Request structured clarification before any candidate action.', 'LOW'));
    else if (strategy === 'RESPOND')
        steps.push(step(1, 'RESPOND', 'Respond using the semantic interpretation.', 'LOW'));
    else if (strategy === 'CONTEXT_RESPONSE') {
        steps.push(step(1, 'RETRIEVE_CONTEXT', 'Use the already resolved scoped conversation context.', 'LOW'));
        steps.push(step(2, 'RESPOND', 'Respond from resolved context.', 'LOW', false, ['step-1-RETRIEVE_CONTEXT']));
    }
    else {
        steps.push(step(1, 'PREPARE_ACTION', 'Prepare a candidate action; do not execute it.', 'MEDIUM', false, [], context.semanticIntent.candidateAction));
        if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL')
            steps.push(step(2, 'REQUEST_APPROVAL', 'Request approval through the existing governed boundary.', riskLevel, true, ['step-1-PREPARE_ACTION'], context.semanticIntent.candidateAction));
        steps.push(step(steps.length + 1, 'EXECUTE_TOOL', 'Submit the candidate action to AgentLoop and PDP; this planner does not execute tools.', riskLevel, riskLevel === 'HIGH' || riskLevel === 'CRITICAL', [steps[steps.length - 1].stepId], context.semanticIntent.candidateAction));
    }
    return Object.freeze({ planId: `plan:${context.userId}:${context.sessionId}:${context.semanticIntent.intentType}`, userId: context.userId, sessionId: context.sessionId, intent: context.semanticIntent, objective: context.semanticIntent.normalizedText, steps: Object.freeze(steps), riskLevel, requiresApproval: riskLevel === 'HIGH' || riskLevel === 'CRITICAL', requiresClarification: Boolean(clarification), clarification, confidence: context.semanticIntent.confidence, createdAt });
}
