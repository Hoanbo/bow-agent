import type { ContextAwarePlan, PlanActionType } from './planningTypes.js';

const ACTIONS = new Set<PlanActionType>(['RESPOND', 'ASK_CLARIFICATION', 'RETRIEVE_CONTEXT', 'RETRIEVE_MEMORY', 'PREPARE_ACTION', 'REQUEST_APPROVAL', 'EXECUTE_TOOL', 'DEFER', 'REJECT']);
const RISKS = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
const UNSAFE = /(__proto__|constructor|prototype|\0|\.\.|[\\/]|bearer\s+\S+|api[_ -]?key|password\s*[:=]|private key)/iu;

// EN: Validate untrusted plan-shaped objects fail-closed, including dependency cycles and secret/path markers.
// VI: Xác thực object có dạng plan theo fail-closed, gồm dependency cycle và dấu hiệu secret/path.
export function validateAgentPlan(plan: unknown): { valid: boolean; errors: string[] } {
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) return { valid: false, errors: ['MALFORMED_PLAN'] };
  const candidate = plan as Partial<ContextAwarePlan>;
  const errors: string[] = [];
  if (typeof candidate.planId !== 'string' || !candidate.planId || UNSAFE.test(candidate.planId)) errors.push('INVALID_PLAN_ID');
  if (typeof candidate.userId !== 'string' || !candidate.userId || UNSAFE.test(candidate.userId)) errors.push('INVALID_USER_ID');
  if (typeof candidate.sessionId !== 'string' || !candidate.sessionId || UNSAFE.test(candidate.sessionId)) errors.push('INVALID_SESSION_ID');
  if (!RISKS.has(String(candidate.riskLevel)) || typeof candidate.confidence !== 'number' || candidate.confidence < 0 || candidate.confidence > 1) errors.push('INVALID_PLAN_METADATA');
  if (!Array.isArray(candidate.steps) || candidate.steps.length === 0) errors.push('INVALID_STEPS');
  else {
    const ids = new Set<string>(); const orders = new Set<number>();
    for (const item of candidate.steps) { if (!ACTIONS.has(item.type) || ids.has(item.stepId) || orders.has(item.order) || !RISKS.has(item.riskLevel) || UNSAFE.test(`${item.stepId} ${item.description}`)) errors.push('INVALID_STEP'); ids.add(item.stepId); orders.add(item.order); if (item.dependencies.some((dependency: string) => dependency === item.stepId || !ids.has(dependency))) errors.push('INVALID_DEPENDENCY'); }
  }
  return { valid: errors.length === 0, errors: [...new Set(errors)] };
}
